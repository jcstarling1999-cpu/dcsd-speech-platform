import { executeWithFallback } from "@platform/adapters/src/index.js";
import { createArtifact, createProviderCall, updateJob, updateJobStep } from "@platform/database/src/index.js";
import { log } from "@platform/observability/src/index.js";

export interface OrchestrateInput {
  jobId: string;
  stepId: string;
  tenantId: string;
  type: "stt" | "tts" | "ocr" | "convert" | "pipeline" | "ingest";
  route: string[];
  inputUri: string;
  inputFormat: string;
  outputFormat: string;
  locale: string;
  region: string;
  payloadBytes: number;
  chars?: number;
  durationSeconds?: number;
}

export async function orchestrateJob(input: OrchestrateInput): Promise<void> {
  updateJob(input.jobId, { status: "running", progress: 0.35, currentStepId: input.stepId });

  try {
    const providerRequest = {
      jobId: input.jobId,
      stepId: input.stepId,
      inputUri: input.inputUri,
      inputFormat: input.inputFormat,
      outputFormat: input.outputFormat,
      locale: input.locale,
      region: input.region,
      payloadBytes: input.payloadBytes,
      options: {}
    } as const;
    const result = await executeWithFallback(
      input.route,
      typeof input.chars === "number"
        ? { ...providerRequest, chars: input.chars }
        : typeof input.durationSeconds === "number"
          ? { ...providerRequest, durationSeconds: input.durationSeconds }
          : providerRequest
    );

    updateJobStep(input.stepId, {
      provider: result.provider,
      status: "succeeded",
      outputManifest: {
        outputUris: result.outputUris,
        metrics: result.metrics,
        segments: result.segments
      }
    });

    createProviderCall({
      jobId: input.jobId,
      stepId: input.stepId,
      provider: result.provider,
      operation: input.type,
      status: "succeeded",
      latencyMs: result.metrics.latencyMs,
      estimatedCostUsd: result.metrics.estimatedCostUsd
    });

    createArtifact({
      jobId: input.jobId,
      tenantId: input.tenantId,
      type: input.type === "tts" ? "audio.final" : input.type === "stt" ? "transcript.final" : input.type === "ocr" ? "ocr_text" : "converted_file",
      format: input.outputFormat,
      storageKey: `outputs/${input.jobId}/orchestrator.${input.outputFormat}`,
      metadata: {
        provider: result.provider,
        segments: result.segments.length
      }
    });

    updateJob(input.jobId, { status: "succeeded", progress: 1 });

    log({
      level: "info",
      service: "orchestrator",
      message: "job orchestrated",
      fields: {
        jobId: input.jobId,
        stepId: input.stepId,
        provider: result.provider,
        outputUris: result.outputUris
      }
    });
  } catch (error) {
    updateJob(input.jobId, {
      status: "failed",
      errorCode: "ORCHESTRATION_FAILED",
      errorMessage: (error as Error).message,
      progress: 1
    });

    updateJobStep(input.stepId, {
      status: "failed",
      errorCode: "ORCHESTRATION_FAILED",
      errorMessage: (error as Error).message
    });

    throw error;
  }
}

if (process.env.RUN_EXAMPLE === "true") {
  log({ level: "info", service: "orchestrator", message: "Set up from API runtime and call orchestrateJob explicitly." });
}
