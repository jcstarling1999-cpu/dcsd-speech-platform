import { z } from "zod";

export const ISODateString = z.string().datetime();
export const UUID = z.string().uuid();

export const ProviderAdapterType = z.enum(["stt", "tts", "ocr", "convert"]);
export const JobType = z.enum(["ingest", "convert", "stt", "tts", "ocr", "pipeline"]);
export const JobStatus = z.enum([
  "draft",
  "queued",
  "planning",
  "running",
  "awaiting_callback",
  "merging",
  "succeeded",
  "partially_succeeded",
  "failed",
  "canceled"
]);

export const JobStepStatus = z.enum([
  "queued",
  "running",
  "awaiting_callback",
  "retrying",
  "succeeded",
  "failed",
  "skipped",
  "canceled",
  "dead_lettered"
]);

export const JobStepType = z.enum([
  "ingest.validate",
  "ingest.normalize",
  "extract.text",
  "extract.media",
  "ocr.process",
  "transcribe.batch",
  "transcribe.realtime",
  "translate.optional",
  "synthesize.chunk",
  "convert.edge",
  "merge.output",
  "webhook.dispatch"
]);

export const ArtifactType = z.enum([
  "transcript.partial",
  "transcript.final",
  "subtitle",
  "audio.partial",
  "audio.final",
  "ocr_text",
  "converted_file",
  "manifest",
  "log"
]);

export const UploadStatus = z.enum(["created", "uploading", "completed", "aborted", "expired"]);
export const QueueName = z.enum([
  "ingest",
  "extract",
  "convert",
  "ocr",
  "stt",
  "tts",
  "merge",
  "callback",
  "webhook-delivery",
  "cleanup"
]);

export const RoutingMode = z.enum(["economy", "balanced", "premium", "pinned"]);

export const RetryProfile = z.object({
  maxAttempts: z.number().int().min(1),
  baseBackoffMs: z.number().int().min(50),
  jitterMs: z.number().int().min(0)
});

export const ProviderCapability = z.object({
  provider: z.string(),
  adapterType: ProviderAdapterType,
  taskClasses: z.array(z.string()).min(1),
  supportedInputFormats: z.array(z.string()).min(1),
  supportedOutputFormats: z.array(z.string()).min(1),
  supportedLocales: z.array(z.string()).default([]),
  maxPayloadBytes: z.number().int().positive(),
  maxDurationSeconds: z.number().int().positive().optional(),
  maxChars: z.number().int().positive().optional(),
  qualityHint: z.enum(["economy", "balanced", "premium"]),
  latencyHint: z.enum(["low", "medium", "high"]),
  costHintUsdPerUnit: z.number().nonnegative(),
  retryProfile: RetryProfile,
  quotaClass: z.enum(["low", "medium", "high", "account-specific"]),
  confidence: z.enum(["confirmed", "assumption"]),
  references: z.array(z.string().url()).default([])
});

export const UploadCreateRequest = z.object({
  tenantId: UUID,
  userId: UUID,
  filename: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  contentType: z.string().min(1),
  checksumSha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
  chunkSizeBytes: z.number().int().min(5 * 1024 * 1024).max(256 * 1024 * 1024).default(16 * 1024 * 1024)
});

export const UploadPartRequest = z.object({
  partNumber: z.number().int().min(1),
  partChecksumSha256: z.string().regex(/^[a-fA-F0-9]{64}$/).optional()
});

export const UploadCompleteRequest = z.object({
  parts: z.array(
    z.object({
      partNumber: z.number().int().min(1),
      etag: z.string().min(1)
    })
  ).min(1)
});

export const SignedUrl = z.object({
  url: z.string().url(),
  expiresAt: ISODateString,
  headers: z.record(z.string()).default({})
});

export const UploadSession = z.object({
  uploadId: UUID,
  tenantId: UUID,
  userId: UUID,
  filename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int().positive(),
  checksumSha256: z.string(),
  chunkSizeBytes: z.number().int().positive(),
  expectedParts: z.number().int().positive(),
  uploadedParts: z.number().int().nonnegative(),
  status: UploadStatus,
  createdAt: ISODateString,
  updatedAt: ISODateString,
  storageKey: z.string(),
  signedUrls: z.array(SignedUrl).default([])
});

export const JobOptions = z.object({
  locale: z.string().default("en-US"),
  targetLocale: z.string().optional(),
  outputFormats: z.array(z.string()).default([]),
  diarization: z.boolean().default(false),
  timestamps: z.boolean().default(true),
  streaming: z.boolean().default(false),
  routingMode: RoutingMode.default("balanced"),
  providerPin: z.string().optional(),
  voiceId: z.string().optional(),
  partialArtifactMode: z.boolean().default(true)
});

export const SubmitJobRequest = z.object({
  idempotencyKey: z.string().min(8).max(200),
  tenantId: UUID,
  userId: UUID,
  fileId: UUID,
  type: JobType,
  options: JobOptions.default({})
});

export const JobRecord = z.object({
  jobId: UUID,
  tenantId: UUID,
  userId: UUID,
  fileId: UUID,
  idempotencyKey: z.string(),
  type: JobType,
  status: JobStatus,
  route: z.array(z.string()).default([]),
  progress: z.number().min(0).max(1).default(0),
  currentStepId: UUID.optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  createdAt: ISODateString,
  updatedAt: ISODateString
});

export const JobStepRecord = z.object({
  stepId: UUID,
  jobId: UUID,
  type: JobStepType,
  provider: z.string().optional(),
  status: JobStepStatus,
  attempt: z.number().int().min(0),
  queue: QueueName,
  inputManifest: z.record(z.unknown()).default({}),
  outputManifest: z.record(z.unknown()).default({}),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  createdAt: ISODateString,
  updatedAt: ISODateString
});

export const ArtifactRecord = z.object({
  artifactId: UUID,
  jobId: UUID,
  tenantId: UUID,
  type: ArtifactType,
  format: z.string(),
  storageKey: z.string(),
  checksumSha256: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: ISODateString
});

export const WebhookEndpointRequest = z.object({
  tenantId: UUID,
  url: z.string().url(),
  events: z.array(z.enum(["job.created", "job.running", "job.succeeded", "job.failed", "artifact.ready"]))
    .min(1)
    .default(["job.succeeded", "job.failed"])
});

export const WebhookEndpointRecord = z.object({
  webhookId: UUID,
  tenantId: UUID,
  url: z.string().url(),
  events: z.array(z.string()).default([]),
  secretPreview: z.string(),
  enabled: z.boolean(),
  createdAt: ISODateString,
  updatedAt: ISODateString
});

export const ApiKeyCreateRequest = z.object({
  tenantId: UUID,
  userId: UUID,
  label: z.string().min(1).max(128),
  scopes: z.array(z.string()).min(1)
});

export const ApiKeyRecord = z.object({
  apiKeyId: UUID,
  tenantId: UUID,
  userId: UUID,
  label: z.string(),
  keyPrefix: z.string(),
  scopes: z.array(z.string()).default([]),
  createdAt: ISODateString,
  lastUsedAt: ISODateString.optional(),
  revokedAt: ISODateString.optional()
});

export const ApiError = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
  issues: z.array(z.unknown()).optional()
});

export const EventType = z.enum([
  "upload.progress",
  "job.updated",
  "job.step.updated",
  "artifact.ready",
  "job.failed"
]);

export const EventEnvelope = z.object({
  eventId: UUID,
  tenantId: UUID,
  jobId: UUID.optional(),
  type: EventType,
  sequence: z.number().int().min(1),
  timestamp: ISODateString,
  payload: z.record(z.unknown())
});

export const JobSubmitResponse = z.object({
  jobId: UUID,
  status: JobStatus,
  route: z.array(z.string())
});

export type TProviderCapability = z.infer<typeof ProviderCapability>;
export type TSubmitJobRequest = z.infer<typeof SubmitJobRequest>;
export type TJobRecord = z.infer<typeof JobRecord>;
export type TJobStepRecord = z.infer<typeof JobStepRecord>;
export type TArtifactRecord = z.infer<typeof ArtifactRecord>;
export type TUploadSession = z.infer<typeof UploadSession>;
export type TEventEnvelope = z.infer<typeof EventEnvelope>;
export type TApiKeyRecord = z.infer<typeof ApiKeyRecord>;
export type TWebhookEndpointRecord = z.infer<typeof WebhookEndpointRecord>;
export type TJobStatus = z.infer<typeof JobStatus>;
export type TJobType = z.infer<typeof JobType>;
export type TJobStepType = z.infer<typeof JobStepType>;
export type TJobStepStatus = z.infer<typeof JobStepStatus>;
export type TRoutingMode = z.infer<typeof RoutingMode>;
export type TQueueName = z.infer<typeof QueueName>;
