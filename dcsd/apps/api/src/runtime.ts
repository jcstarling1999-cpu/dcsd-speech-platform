import { randomUUID } from "node:crypto";
import {
  type TEventEnvelope,
  type TJobRecord,
  type TJobStatus,
  type TSubmitJobRequest,
  type TUploadSession,
  type TQueueName
} from "@platform/contracts/src/index.js";
import { byType, executeWithFallback } from "@platform/adapters/src/index.js";
import {
  appendEvent,
  createArtifact,
  createDlqRecord,
  createJob,
  createJobStep,
  createProviderCall,
  createUsageRecord,
  getAsset,
  getIdempotency,
  getJob,
  getUploadSession,
  listArtifacts,
  listJobSteps,
  reserveIdempotency,
  updateJob,
  updateJobStatus,
  updateJobStep
} from "@platform/database/src/index.js";
import { incrementMetric, log } from "@platform/observability/src/index.js";
import { createQueueClient, type QueueClient, TokenBucket } from "@platform/queue/src/index.js";
import { computeBackoff, defaultRouteForJobType } from "@platform/workflow/src/index.js";

export interface JobQueuePayload {
  tenantId: string;
  userId: string;
  jobId: string;
  type: TSubmitJobRequest["type"];
  attempt: number;
}

export interface RuntimeConfig {
  region: string;
  defaultRoutingMode: "economy" | "balanced" | "premium" | "pinned";
  queueEnv?: {
    QUEUE_DRIVER?: "memory" | "upstash-rest" | "bullmq-compatible";
    UPSTASH_REDIS_REST_URL?: string | undefined;
    UPSTASH_REDIS_REST_TOKEN?: string | undefined;
  };
}

export class PlatformRuntime {
  readonly queue: QueueClient;
  private readonly subscribers = new Set<(event: TEventEnvelope) => void>();
  private readonly providerTokens = new Map<string, TokenBucket>();

  constructor(private readonly config: RuntimeConfig) {
    this.queue = createQueueClient({
      QUEUE_DRIVER: config.queueEnv?.QUEUE_DRIVER,
      UPSTASH_REDIS_REST_URL: config.queueEnv?.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: config.queueEnv?.UPSTASH_REDIS_REST_TOKEN
    });
  }

  subscribe(handler: (event: TEventEnvelope) => void): () => void {
    this.subscribers.add(handler);
    return () => this.subscribers.delete(handler);
  }

  async submitJob(payload: TSubmitJobRequest): Promise<TJobRecord> {
    const existing = getIdempotency("jobs.create", payload.tenantId, payload.idempotencyKey);
    if (existing?.resourceId) {
      const existingJob = getJob(existing.resourceId);
      if (existingJob) {
        return existingJob;
      }
    }

    const asset = getAsset(payload.fileId);
    if (!asset) {
      throw new Error("ASSET_NOT_FOUND");
    }

    const routeInput = {
      type: payload.type,
      mode: payload.options.routingMode ?? this.config.defaultRoutingMode
    } as const;
    const route = defaultRouteForJobType(
      payload.options.providerPin
        ? { ...routeInput, providerPin: payload.options.providerPin }
        : routeInput
    );

    const job = createJob({
      tenantId: payload.tenantId,
      userId: payload.userId,
      fileId: payload.fileId,
      idempotencyKey: payload.idempotencyKey,
      type: payload.type,
      status: "queued",
      route,
      progress: 0
    });

    reserveIdempotency("jobs.create", payload.tenantId, payload.idempotencyKey, job.jobId);

    await this.queue.enqueue({
      queue: mapJobTypeToQueue(payload.type),
      dedupeKey: `${payload.tenantId}:${payload.idempotencyKey}`,
      payload: {
        tenantId: payload.tenantId,
        userId: payload.userId,
        jobId: job.jobId,
        type: payload.type,
        attempt: 0
      },
      maxAttempts: 5
    });

    this.emitEvent({
      eventId: randomUUID(),
      tenantId: payload.tenantId,
      jobId: job.jobId,
      type: "job.updated",
      sequence: 1,
      timestamp: new Date().toISOString(),
      payload: {
        status: job.status,
        progress: job.progress,
        route
      }
    });

    incrementMetric("jobs.submitted");
    return job;
  }

  async processQueueTick(maxPerQueue = 2): Promise<number> {
    const queues: TQueueName[] = ["stt", "tts", "ocr", "convert", "ingest", "extract", "merge", "callback", "webhook-delivery", "cleanup"];
    let processed = 0;

    for (const queueName of queues) {
      const messages = await this.queue.poll(queueName, maxPerQueue);
      for (const msg of messages) {
        processed += 1;
        await this.processMessage(queueName, msg.id, msg.payload as unknown as JobQueuePayload, msg.attempt);
      }
    }

    return processed;
  }

  private async processMessage(queueName: TQueueName, messageId: string, payload: JobQueuePayload, attempt: number): Promise<void> {
    const job = getJob(payload.jobId);
    if (!job) {
      await this.queue.ack(queueName, messageId);
      return;
    }

    try {
      if (job.status === "canceled" || job.status === "failed" || job.status === "succeeded") {
        await this.queue.ack(queueName, messageId);
        return;
      }

      updateJobStatus(job.jobId, "planning", 0.05);
      this.emitJobUpdate(job.jobId, job.tenantId, "planning", 0.05);

      const step = createJobStep({
        jobId: job.jobId,
        type: mapJobTypeToStepType(job.type),
        status: "running",
        attempt,
        queue: queueName,
        inputManifest: {
          fileId: job.fileId,
          route: job.route
        },
        outputManifest: {}
      });

      updateJob(job.jobId, {
        status: "running",
        progress: 0.25,
        currentStepId: step.stepId
      });
      this.emitJobUpdate(job.jobId, job.tenantId, "running", 0.25);

      const sourceAsset = getAsset(job.fileId);
      const inputUri = sourceAsset ? sourceAsset.storageKey : `asset://${job.fileId}`;
      const inputFormat = inferInputFormat(sourceAsset?.filename ?? "unknown.bin");
      const payloadBytes = sourceAsset?.sizeBytes ?? 10_000;
      const locale = "en-US";

      let transcriptText = "";
      let primaryProviderResult;
      if (job.type === "pipeline") {
        const extractionRoute =
          inputFormat === "pdf" || inputFormat === "jpg" || inputFormat === "jpeg" || inputFormat === "png" || inputFormat === "tiff"
            ? ["ocr.azure", "ocr.google", "ocr.local"]
            : ["stt.azure", "stt.google", "stt.aws", "stt.whisper.local"];

        const extracted = await executeWithFallback(extractionRoute, {
          jobId: job.jobId,
          stepId: step.stepId,
          inputUri,
          inputFormat,
          outputFormat: "json",
          locale,
          region: this.config.region,
          payloadBytes,
          durationSeconds: 3600,
          options: {}
        });
        primaryProviderResult = extracted;
        transcriptText = extracted.segments.map((segment) => segment.text ?? "").filter(Boolean).join(" ").trim();
        if (!transcriptText && extracted.outputUris[0]?.startsWith("data:text/plain;base64,")) {
          transcriptText = Buffer.from(extracted.outputUris[0].split(",")[1] ?? "", "base64").toString("utf-8");
        }

        const tts = await executeWithFallback(["tts.azure", "tts.google", "tts.aws"], {
          jobId: job.jobId,
          stepId: step.stepId,
          inputUri,
          inputFormat: "txt",
          outputFormat: "mp3",
          locale,
          region: this.config.region,
          payloadBytes: Math.max(transcriptText.length, 1),
          chars: Math.max(transcriptText.length, 1),
          options: { sourceText: transcriptText || "No transcript could be extracted from source." }
        });

        updateJobStep(step.stepId, {
          provider: `${extracted.provider}->${tts.provider}`,
          status: "succeeded",
          outputManifest: {
            outputUris: [extracted.outputUris[0], tts.outputUris[0]].filter(Boolean),
            metrics: { extract: extracted.metrics, tts: tts.metrics },
            segments: extracted.segments
          }
        });

        createProviderCall({
          jobId: job.jobId,
          stepId: step.stepId,
          provider: extracted.provider,
          operation: "extract",
          status: "succeeded",
          latencyMs: extracted.metrics.latencyMs,
          estimatedCostUsd: extracted.metrics.estimatedCostUsd
        });
        createProviderCall({
          jobId: job.jobId,
          stepId: step.stepId,
          provider: tts.provider,
          operation: "tts",
          status: "succeeded",
          latencyMs: tts.metrics.latencyMs,
          estimatedCostUsd: tts.metrics.estimatedCostUsd
        });

        createUsageRecord({
          tenantId: job.tenantId,
          jobId: job.jobId,
          provider: extracted.provider,
          unit: "seconds",
          quantity: 1,
          estimatedCostUsd: extracted.metrics.estimatedCostUsd
        });
        createUsageRecord({
          tenantId: job.tenantId,
          jobId: job.jobId,
          provider: tts.provider,
          unit: "chars",
          quantity: Math.max(transcriptText.length, 1),
          estimatedCostUsd: tts.metrics.estimatedCostUsd
        });

        const transcriptArtifact = createArtifact({
          jobId: job.jobId,
          tenantId: job.tenantId,
          type: "transcript.final",
          format: "txt",
          storageKey: `data:text/plain;base64,${Buffer.from(transcriptText || "").toString("base64")}`,
          metadata: { provider: extracted.provider, timestamps: extracted.segments }
        });
        const audioArtifact = createArtifact({
          jobId: job.jobId,
          tenantId: job.tenantId,
          type: "audio.final",
          format: "mp3",
          storageKey: tts.outputUris[0] ?? `outputs/${job.jobId}/final.mp3`,
          metadata: { provider: tts.provider }
        });

        this.emitEvent({
          eventId: randomUUID(),
          tenantId: job.tenantId,
          jobId: job.jobId,
          type: "artifact.ready",
          sequence: 2,
          timestamp: new Date().toISOString(),
          payload: transcriptArtifact
        });
        this.emitEvent({
          eventId: randomUUID(),
          tenantId: job.tenantId,
          jobId: job.jobId,
          type: "artifact.ready",
          sequence: 3,
          timestamp: new Date().toISOString(),
          payload: audioArtifact
        });
      } else {
        const adapterType = job.type;
        const adapters = byType(adapterType as "stt" | "tts" | "ocr" | "convert");
        if (adapters.length === 0) {
          throw new Error(`NO_ADAPTERS_FOR_TYPE:${adapterType}`);
        }
        const preferredProvider = job.route[0];
        if (preferredProvider && !this.canUseProvider(preferredProvider)) {
          throw new Error(`PROVIDER_BACKPRESSURE:${preferredProvider}`);
        }
        const providerRequest = {
          jobId: job.jobId,
          stepId: step.stepId,
          inputUri,
          inputFormat,
          outputFormat: outputFormatForJob(job.type),
          locale,
          region: this.config.region,
          payloadBytes,
          options: {}
        } as const;
        const provider = await executeWithFallback(
          job.route,
          job.type === "tts"
            ? { ...providerRequest, chars: 5000 }
            : job.type === "stt"
              ? { ...providerRequest, durationSeconds: 3600 }
              : providerRequest
        );
        primaryProviderResult = provider;
        updateJobStep(step.stepId, {
          provider: provider.provider,
          status: "succeeded",
          outputManifest: {
            outputUris: provider.outputUris,
            metrics: provider.metrics,
            segments: provider.segments
          }
        });
        createProviderCall({
          jobId: job.jobId,
          stepId: step.stepId,
          provider: provider.provider,
          operation: mapJobTypeToOperation(job.type),
          status: "succeeded",
          latencyMs: provider.metrics.latencyMs,
          estimatedCostUsd: provider.metrics.estimatedCostUsd
        });
        createUsageRecord({
          tenantId: job.tenantId,
          jobId: job.jobId,
          provider: provider.provider,
          unit: job.type === "tts" ? "chars" : job.type === "ocr" ? "pages" : "seconds",
          quantity: job.type === "tts" ? 5000 : 1,
          estimatedCostUsd: provider.metrics.estimatedCostUsd
        });
      }

      const partialArtifact = createArtifact({
        jobId: job.jobId,
        tenantId: job.tenantId,
        type: partialArtifactTypeForJob(job.type),
        format: outputFormatForJob(job.type),
        storageKey: primaryProviderResult?.outputUris?.[0] ?? `outputs/${job.jobId}/partial.${outputFormatForJob(job.type)}`,
        metadata: {
          progressive: true,
          provider: primaryProviderResult?.provider ?? "unknown",
          sequence: 1
        }
      });

      this.emitEvent({
        eventId: randomUUID(),
        tenantId: job.tenantId,
        jobId: job.jobId,
        type: "artifact.ready",
        sequence: 2,
        timestamp: new Date().toISOString(),
        payload: partialArtifact
      });

      const finalArtifact = createArtifact({
        jobId: job.jobId,
        tenantId: job.tenantId,
        type: finalArtifactTypeForJob(job.type),
        format: outputFormatForJob(job.type),
        storageKey: primaryProviderResult?.outputUris?.[0] ?? `outputs/${job.jobId}/final.${outputFormatForJob(job.type)}`,
        metadata: {
          progressive: false,
          mergedFrom: primaryProviderResult?.outputUris ?? []
        }
      });

      updateJobStatus(job.jobId, "merging", 0.85);
      this.emitJobUpdate(job.jobId, job.tenantId, "merging", 0.85);

      updateJobStatus(job.jobId, "succeeded", 1);
      this.emitJobUpdate(job.jobId, job.tenantId, "succeeded", 1);

      this.emitEvent({
        eventId: randomUUID(),
        tenantId: job.tenantId,
        jobId: job.jobId,
        type: "artifact.ready",
        sequence: 3,
        timestamp: new Date().toISOString(),
        payload: finalArtifact
      });

      incrementMetric("jobs.succeeded");
      await this.queue.ack(queueName, messageId);
    } catch (error) {
      const message = (error as Error).message;
      const backoffMs = computeBackoff(1_000, attempt, 30_000, 300);

      log({
        level: "warn",
        service: "runtime",
        message: "job processing failed",
        fields: {
          queue: queueName,
          messageId,
          jobId: payload.jobId,
          attempt,
          error: message,
          backoffMs
        }
      });

      if (attempt >= 4) {
        updateJob(payload.jobId, {
          status: "failed",
          errorCode: "PROCESSING_FAILED",
          errorMessage: message,
          progress: 1
        });

        createDlqRecord({
          queue: queueName,
          tenantId: payload.tenantId,
          jobId: payload.jobId,
          reason: message,
          payload: payload as unknown as Record<string, unknown>
        });

        this.emitEvent({
          eventId: randomUUID(),
          tenantId: payload.tenantId,
          jobId: payload.jobId,
          type: "job.failed",
          sequence: 99,
          timestamp: new Date().toISOString(),
          payload: {
            status: "failed",
            reason: message
          }
        });

        incrementMetric("jobs.failed");
        await this.queue.deadLetter(queueName, messageId, message);
        return;
      }

      await this.queue.retry(queueName, messageId, backoffMs, message);
    }
  }

  getJobView(jobId: string): {
    job: TJobRecord;
    steps: ReturnType<typeof listJobSteps>;
    artifacts: ReturnType<typeof listArtifacts>;
  } {
    const job = getJob(jobId);
    if (!job) {
      throw new Error("JOB_NOT_FOUND");
    }

    return {
      job,
      steps: listJobSteps(jobId),
      artifacts: listArtifacts(jobId)
    };
  }

  getUpload(uploadId: string): TUploadSession {
    const upload = getUploadSession(uploadId);
    if (!upload) {
      throw new Error("UPLOAD_NOT_FOUND");
    }
    return upload;
  }

  private emitJobUpdate(jobId: string, tenantId: string, status: TJobStatus, progress: number): void {
    this.emitEvent({
      eventId: randomUUID(),
      tenantId,
      jobId,
      type: "job.updated",
      sequence: Math.max(1, Math.floor(progress * 100)),
      timestamp: new Date().toISOString(),
      payload: { status, progress }
    });
  }

  private emitEvent(event: TEventEnvelope): void {
    appendEvent(event);
    for (const subscriber of this.subscribers) {
      subscriber(event);
    }
  }

  canUseProvider(providerId: string): boolean {
    const bucket = this.providerTokens.get(providerId) ?? new TokenBucket({ capacity: 20, refillPerSecond: 10 });
    this.providerTokens.set(providerId, bucket);
    return bucket.tryTake(1);
  }
}

function mapJobTypeToStepType(jobType: TSubmitJobRequest["type"]):
  | "transcribe.batch"
  | "synthesize.chunk"
  | "ocr.process"
  | "convert.edge"
  | "extract.media"
  | "ingest.validate" {
  switch (jobType) {
    case "stt":
      return "transcribe.batch";
    case "tts":
      return "synthesize.chunk";
    case "ocr":
      return "ocr.process";
    case "convert":
      return "convert.edge";
    case "pipeline":
      return "extract.media";
    case "ingest":
      return "ingest.validate";
  }
}

function mapJobTypeToQueue(jobType: TSubmitJobRequest["type"]): TQueueName {
  switch (jobType) {
    case "stt":
      return "stt";
    case "tts":
      return "tts";
    case "ocr":
      return "ocr";
    case "convert":
      return "convert";
    case "pipeline":
      return "extract";
    case "ingest":
      return "ingest";
  }
}

function mapJobTypeToOperation(jobType: TSubmitJobRequest["type"]): string {
  switch (jobType) {
    case "stt":
      return "transcribe";
    case "tts":
      return "synthesize";
    case "ocr":
      return "ocr";
    case "convert":
      return "convert";
    case "pipeline":
      return "pipeline";
    case "ingest":
      return "ingest";
  }
}

function outputFormatForJob(jobType: TSubmitJobRequest["type"]): string {
  switch (jobType) {
    case "stt":
      return "json";
    case "tts":
      return "mp3";
    case "ocr":
      return "txt";
    case "convert":
      return "pdf";
    case "pipeline":
      return "json";
    case "ingest":
      return "json";
  }
}

function partialArtifactTypeForJob(jobType: TSubmitJobRequest["type"]): "transcript.partial" | "audio.partial" | "ocr_text" | "converted_file" | "manifest" {
  switch (jobType) {
    case "stt":
      return "transcript.partial";
    case "tts":
      return "audio.partial";
    case "ocr":
      return "ocr_text";
    case "convert":
      return "converted_file";
    case "pipeline":
      return "manifest";
    case "ingest":
      return "manifest";
  }
}

function finalArtifactTypeForJob(jobType: TSubmitJobRequest["type"]): "transcript.final" | "audio.final" | "ocr_text" | "converted_file" | "manifest" {
  switch (jobType) {
    case "stt":
      return "transcript.final";
    case "tts":
      return "audio.final";
    case "ocr":
      return "ocr_text";
    case "convert":
      return "converted_file";
    case "pipeline":
      return "manifest";
    case "ingest":
      return "manifest";
  }
}

function inferInputFormat(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "bin";
}
