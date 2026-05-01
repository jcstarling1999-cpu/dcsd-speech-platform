import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  type TApiKeyRecord,
  type TArtifactRecord,
  type TEventEnvelope,
  type TJobRecord,
  type TJobStatus,
  type TJobStepRecord,
  type TQueueName,
  type TUploadSession,
  type TWebhookEndpointRecord
} from "@platform/contracts/src/index.js";

export const schemaVersion = "002_production_core";

export interface ApiKeyLookupRecord extends TApiKeyRecord {
  keyHash: string;
}

interface UploadPartInternal {
  partNumber: number;
  etag: string;
}

interface UploadInternal extends TUploadSession {
  parts: UploadPartInternal[];
}

interface AssetRecord {
  assetId: string;
  tenantId: string;
  ownerId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  storageKey: string;
  createdAt: string;
}

interface IdempotencyRecord {
  scope: string;
  tenantId: string;
  key: string;
  resourceId: string;
  createdAt: string;
}

interface DlqRecord {
  dlqId: string;
  queue: TQueueName;
  tenantId: string;
  jobId?: string;
  reason: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

interface ProviderCallRecord {
  providerCallId: string;
  jobId: string;
  stepId: string;
  provider: string;
  operation: string;
  status: "running" | "succeeded" | "failed";
  latencyMs: number;
  estimatedCostUsd: number;
  requestBytes?: number;
  responseBytes?: number;
  createdAt: string;
  updatedAt: string;
}

interface UsageRecord {
  usageId: string;
  tenantId: string;
  jobId: string;
  provider: string;
  unit: "chars" | "seconds" | "pages" | "bytes";
  quantity: number;
  estimatedCostUsd: number;
  createdAt: string;
}

interface VoiceConsentRecord {
  consentId: string;
  tenantId: string;
  subject: string;
  consentType: "voice-cloning";
  grantedByUserId: string;
  evidenceUri: string;
  grantedAt: string;
  revokedAt?: string;
}

interface PolicyRecord {
  policyId: string;
  tenantId: string;
  key: string;
  value: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

class InMemoryStore {
  readonly uploads = new Map<string, UploadInternal>();
  readonly assets = new Map<string, AssetRecord>();
  readonly jobs = new Map<string, TJobRecord>();
  readonly steps = new Map<string, TJobStepRecord>();
  readonly artifacts = new Map<string, TArtifactRecord>();
  readonly events = new Map<string, TEventEnvelope[]>();
  readonly webhooks = new Map<string, TWebhookEndpointRecord>();
  readonly apiKeys = new Map<string, ApiKeyLookupRecord>();
  readonly idempotency = new Map<string, IdempotencyRecord>();
  readonly providerCalls = new Map<string, ProviderCallRecord>();
  readonly usage = new Map<string, UsageRecord>();
  readonly dlq = new Map<string, DlqRecord>();
  readonly voiceConsents = new Map<string, VoiceConsentRecord>();
  readonly policies = new Map<string, PolicyRecord>();
}

const db = new InMemoryStore();
const supabase = createSupabaseClientFromEnv();

function nowIso(): string {
  return new Date().toISOString();
}

function createSupabaseClientFromEnv(): SupabaseClient | null {
  if (process.env.NODE_ENV === "test") {
    return null;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    return null;
  }
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

function mirrorAsync(fn: (client: SupabaseClient) => Promise<void>): void {
  if (!supabase) {
    return;
  }
  void fn(supabase).catch(() => {
    // Mirror writes are best effort. Runtime path still uses in-memory records.
  });
}

export function createUploadSession(input: Omit<TUploadSession, "uploadId" | "createdAt" | "updatedAt" | "uploadedParts" | "status" | "signedUrls">): TUploadSession {
  const createdAt = nowIso();
  const uploadId = randomUUID();
  const record: UploadInternal = {
    uploadId,
    tenantId: input.tenantId,
    userId: input.userId,
    filename: input.filename,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    checksumSha256: input.checksumSha256,
    chunkSizeBytes: input.chunkSizeBytes,
    expectedParts: input.expectedParts,
    uploadedParts: 0,
    status: "created",
    createdAt,
    updatedAt: createdAt,
    storageKey: input.storageKey,
    signedUrls: [],
    parts: []
  };

  db.uploads.set(uploadId, record);
  mirrorAsync(async (client) => {
    await client.from("upload_sessions").upsert({
      id: record.uploadId,
      org_id: record.tenantId,
      user_id: record.userId,
      filename: record.filename,
      mime_type: record.contentType,
      size_bytes: record.sizeBytes,
      checksum_sha256: record.checksumSha256,
      chunk_size_bytes: record.chunkSizeBytes,
      expected_parts: record.expectedParts,
      uploaded_parts: record.uploadedParts,
      status: record.status,
      storage_key: record.storageKey,
      updated_at: record.updatedAt
    });
  });
  return sanitizeUpload(record);
}

export function getUploadSession(uploadId: string): TUploadSession | undefined {
  const record = db.uploads.get(uploadId);
  return record ? sanitizeUpload(record) : undefined;
}

export function attachUploadSignedUrls(uploadId: string, signedUrls: TUploadSession["signedUrls"]): TUploadSession {
  const record = db.uploads.get(uploadId);
  if (!record) {
    throw new Error("UPLOAD_NOT_FOUND");
  }

  record.signedUrls = signedUrls;
  record.status = "uploading";
  record.updatedAt = nowIso();
  mirrorAsync(async (client) => {
    await client.from("upload_sessions").update({
      status: record.status,
      uploaded_parts: record.uploadedParts,
      updated_at: record.updatedAt
    }).eq("id", record.uploadId);
  });
  return sanitizeUpload(record);
}

export function completeUpload(uploadId: string, parts: Array<{ partNumber: number; etag: string }>): { upload: TUploadSession; asset: AssetRecord } {
  const record = db.uploads.get(uploadId);
  if (!record) {
    throw new Error("UPLOAD_NOT_FOUND");
  }

  record.parts = parts;
  record.uploadedParts = parts.length;
  record.status = "completed";
  record.updatedAt = nowIso();

  const asset: AssetRecord = {
    assetId: randomUUID(),
    tenantId: record.tenantId,
    ownerId: record.userId,
    filename: record.filename,
    contentType: record.contentType,
    sizeBytes: record.sizeBytes,
    checksumSha256: record.checksumSha256,
    storageKey: record.signedUrls[0]?.url ?? record.storageKey,
    createdAt: nowIso()
  };
  db.assets.set(asset.assetId, asset);
  mirrorAsync(async (client) => {
    await client.from("upload_sessions").update({
      status: record.status,
      uploaded_parts: record.uploadedParts,
      updated_at: record.updatedAt
    }).eq("id", record.uploadId);

    await client.from("assets").upsert({
      id: asset.assetId,
      org_id: asset.tenantId,
      owner_id: asset.ownerId,
      source_filename: asset.filename,
      mime_type: asset.contentType,
      size_bytes: asset.sizeBytes,
      checksum_sha256: asset.checksumSha256,
      storage_key: asset.storageKey
    });
  });

  return {
    upload: sanitizeUpload(record),
    asset
  };
}

export function getAsset(assetId: string): AssetRecord | undefined {
  return db.assets.get(assetId);
}

export function reserveIdempotency(scope: string, tenantId: string, key: string, resourceId: string): IdempotencyRecord {
  const dedupeKey = `${tenantId}:${scope}:${key}`;
  const existing = db.idempotency.get(dedupeKey);
  if (existing) {
    return existing;
  }

  const record: IdempotencyRecord = {
    scope,
    tenantId,
    key,
    resourceId,
    createdAt: nowIso()
  };
  db.idempotency.set(dedupeKey, record);
  mirrorAsync(async (client) => {
    await client.from("idempotency_records").upsert({
      id: randomUUID(),
      org_id: tenantId,
      scope,
      idem_key: key,
      resource_id: resourceId
    }, { onConflict: "org_id,scope,idem_key" });
  });
  return record;
}

export function getIdempotency(scope: string, tenantId: string, key: string): IdempotencyRecord | undefined {
  return db.idempotency.get(`${tenantId}:${scope}:${key}`);
}

export function createJob(input: Omit<TJobRecord, "jobId" | "createdAt" | "updatedAt">): TJobRecord {
  const jobId = randomUUID();
  const createdAt = nowIso();
  const record: TJobRecord = {
    ...input,
    jobId,
    createdAt,
    updatedAt: createdAt
  };

  db.jobs.set(jobId, record);
  mirrorAsync(async (client) => {
    await client.from("jobs").upsert({
      id: record.jobId,
      org_id: record.tenantId,
      created_by: record.userId,
      asset_id: record.fileId,
      type: record.type,
      status: record.status,
      region: "eastus2",
      idempotency_key: record.idempotencyKey,
      options_json: { route: record.route, progress: record.progress, currentStepId: record.currentStepId },
      error_code: record.errorCode,
      error_message: record.errorMessage,
      updated_at: record.updatedAt
    });
  });
  return record;
}

export function updateJob(jobId: string, patch: Partial<TJobRecord>): TJobRecord {
  const existing = db.jobs.get(jobId);
  if (!existing) {
    throw new Error("JOB_NOT_FOUND");
  }

  const updated: TJobRecord = {
    ...existing,
    ...patch,
    updatedAt: nowIso()
  };

  db.jobs.set(jobId, updated);
  mirrorAsync(async (client) => {
    await client.from("jobs").update({
      status: updated.status,
      options_json: { route: updated.route, progress: updated.progress, currentStepId: updated.currentStepId },
      error_code: updated.errorCode,
      error_message: updated.errorMessage,
      updated_at: updated.updatedAt
    }).eq("id", updated.jobId);
  });
  return updated;
}

export function updateJobStatus(jobId: string, status: TJobStatus, progress?: number): TJobRecord {
  return updateJob(jobId, { status, progress: progress ?? db.jobs.get(jobId)?.progress ?? 0 });
}

export function listJobsByTenant(tenantId: string): TJobRecord[] {
  return [...db.jobs.values()].filter((job) => job.tenantId === tenantId);
}

export function getJob(jobId: string): TJobRecord | undefined {
  return db.jobs.get(jobId);
}

export function createJobStep(input: Omit<TJobStepRecord, "stepId" | "createdAt" | "updatedAt">): TJobStepRecord {
  const createdAt = nowIso();
  const step: TJobStepRecord = {
    ...input,
    stepId: randomUUID(),
    createdAt,
    updatedAt: createdAt
  };

  db.steps.set(step.stepId, step);
  mirrorAsync(async (client) => {
    await client.from("job_steps").upsert({
      id: step.stepId,
      job_id: step.jobId,
      step_type: step.type,
      provider: step.provider,
      status: step.status,
      attempt: step.attempt,
      input_manifest: step.inputManifest,
      output_manifest: step.outputManifest
    });
  });
  return step;
}

export function updateJobStep(stepId: string, patch: Partial<TJobStepRecord>): TJobStepRecord {
  const existing = db.steps.get(stepId);
  if (!existing) {
    throw new Error("STEP_NOT_FOUND");
  }

  const updated: TJobStepRecord = {
    ...existing,
    ...patch,
    updatedAt: nowIso()
  };
  db.steps.set(stepId, updated);
  mirrorAsync(async (client) => {
    await client.from("job_steps").update({
      provider: updated.provider,
      status: updated.status,
      attempt: updated.attempt,
      input_manifest: updated.inputManifest,
      output_manifest: updated.outputManifest
    }).eq("id", updated.stepId);
  });
  return updated;
}

export function listJobSteps(jobId: string): TJobStepRecord[] {
  return [...db.steps.values()].filter((step) => step.jobId === jobId);
}

export function createArtifact(input: Omit<TArtifactRecord, "artifactId" | "createdAt">): TArtifactRecord {
  const artifact: TArtifactRecord = {
    ...input,
    artifactId: randomUUID(),
    createdAt: nowIso()
  };

  db.artifacts.set(artifact.artifactId, artifact);
  mirrorAsync(async (client) => {
    await client.from("artifacts").upsert({
      id: artifact.artifactId,
      job_id: artifact.jobId,
      artifact_type: artifact.type,
      format: artifact.format,
      storage_key: artifact.storageKey,
      metadata_json: artifact.metadata
    });
  });
  return artifact;
}

export function listArtifacts(jobId: string): TArtifactRecord[] {
  return [...db.artifacts.values()].filter((artifact) => artifact.jobId === jobId);
}

export function appendEvent(event: TEventEnvelope): void {
  const key = event.tenantId;
  const tenantEvents = db.events.get(key) ?? [];
  tenantEvents.push(event);
  db.events.set(key, tenantEvents);
}

export function listEvents(tenantId: string): TEventEnvelope[] {
  return db.events.get(tenantId) ?? [];
}

export function createWebhookEndpoint(input: Omit<TWebhookEndpointRecord, "webhookId" | "createdAt" | "updatedAt">): TWebhookEndpointRecord {
  const now = nowIso();
  const record: TWebhookEndpointRecord = {
    ...input,
    webhookId: randomUUID(),
    createdAt: now,
    updatedAt: now
  };

  db.webhooks.set(record.webhookId, record);
  mirrorAsync(async (client) => {
    await client.from("webhook_endpoints").upsert({
      id: record.webhookId,
      org_id: record.tenantId,
      url: record.url,
      secret_hash: record.secretPreview,
      enabled: record.enabled
    });
  });
  return record;
}

export function listWebhookEndpoints(tenantId: string): TWebhookEndpointRecord[] {
  return [...db.webhooks.values()].filter((hook) => hook.tenantId === tenantId);
}

export function createApiKey(input: Omit<TApiKeyRecord, "apiKeyId" | "createdAt" | "lastUsedAt" | "revokedAt"> & { keyHash: string }): TApiKeyRecord {
  const now = nowIso();
  const record: ApiKeyLookupRecord = {
    ...input,
    apiKeyId: randomUUID(),
    createdAt: now
  };

  db.apiKeys.set(record.apiKeyId, record);
  mirrorAsync(async (client) => {
    await client.from("api_keys").upsert({
      id: record.apiKeyId,
      org_id: record.tenantId,
      label: record.label,
      key_hash: record.keyHash,
      scopes: record.scopes,
      created_by: record.userId,
      last_used_at: record.lastUsedAt,
      revoked_at: record.revokedAt
    });
  });
  return sanitizeApiKey(record);
}

export function listApiKeys(tenantId: string): TApiKeyRecord[] {
  return [...db.apiKeys.values()].filter((key) => key.tenantId === tenantId).map(sanitizeApiKey);
}

export function findApiKeyByPrefix(prefix: string): ApiKeyLookupRecord | undefined {
  return [...db.apiKeys.values()].find((value) => value.keyPrefix === prefix && !value.revokedAt);
}

export function updateApiKeyLastUsed(apiKeyId: string): void {
  const existing = db.apiKeys.get(apiKeyId);
  if (!existing) {
    return;
  }
  existing.lastUsedAt = nowIso();
  db.apiKeys.set(apiKeyId, existing);
  mirrorAsync(async (client) => {
    await client.from("api_keys").update({ last_used_at: existing.lastUsedAt }).eq("id", apiKeyId);
  });
}

export function revokeApiKey(apiKeyId: string, tenantId: string): TApiKeyRecord {
  const existing = db.apiKeys.get(apiKeyId);
  if (!existing || existing.tenantId !== tenantId) {
    throw new Error("API_KEY_NOT_FOUND");
  }
  existing.revokedAt = nowIso();
  db.apiKeys.set(apiKeyId, existing);
  mirrorAsync(async (client) => {
    await client.from("api_keys").update({ revoked_at: existing.revokedAt }).eq("id", apiKeyId);
  });
  return sanitizeApiKey(existing);
}

export function createDlqRecord(input: Omit<DlqRecord, "dlqId" | "createdAt">): DlqRecord {
  const record: DlqRecord = {
    ...input,
    dlqId: randomUUID(),
    createdAt: nowIso()
  };
  db.dlq.set(record.dlqId, record);
  return record;
}

export function listDlqRecords(tenantId: string): DlqRecord[] {
  return [...db.dlq.values()].filter((item) => item.tenantId === tenantId);
}

export function createProviderCall(input: Omit<ProviderCallRecord, "providerCallId" | "createdAt" | "updatedAt">): ProviderCallRecord {
  const now = nowIso();
  const record: ProviderCallRecord = {
    ...input,
    providerCallId: randomUUID(),
    createdAt: now,
    updatedAt: now
  };

  db.providerCalls.set(record.providerCallId, record);
  mirrorAsync(async (client) => {
    await client.from("provider_calls").upsert({
      id: record.providerCallId,
      job_id: record.jobId,
      step_id: record.stepId,
      provider: record.provider,
      operation: record.operation,
      status: record.status,
      latency_ms: record.latencyMs,
      estimated_cost_usd: record.estimatedCostUsd,
      request_bytes: record.requestBytes,
      response_bytes: record.responseBytes,
      updated_at: record.updatedAt
    });
  });
  return record;
}

export function createUsageRecord(input: Omit<UsageRecord, "usageId" | "createdAt">): UsageRecord {
  const record: UsageRecord = {
    ...input,
    usageId: randomUUID(),
    createdAt: nowIso()
  };

  db.usage.set(record.usageId, record);
  mirrorAsync(async (client) => {
    await client.from("usage_metering").upsert({
      id: record.usageId,
      org_id: record.tenantId,
      job_id: record.jobId,
      provider: record.provider,
      usage_unit: record.unit,
      usage_quantity: record.quantity,
      estimated_cost_usd: record.estimatedCostUsd
    });
  });
  return record;
}

export function createVoiceConsent(input: Omit<VoiceConsentRecord, "consentId" | "grantedAt">): VoiceConsentRecord {
  const record: VoiceConsentRecord = {
    ...input,
    consentId: randomUUID(),
    grantedAt: nowIso()
  };

  db.voiceConsents.set(record.consentId, record);
  return record;
}

export function upsertPolicy(tenantId: string, key: string, value: Record<string, unknown>): PolicyRecord {
  const existing = [...db.policies.values()].find((item) => item.tenantId === tenantId && item.key === key);
  const now = nowIso();

  if (existing) {
    const updated: PolicyRecord = {
      ...existing,
      value,
      updatedAt: now
    };
    db.policies.set(existing.policyId, updated);
    return updated;
  }

  const record: PolicyRecord = {
    policyId: randomUUID(),
    tenantId,
    key,
    value,
    createdAt: now,
    updatedAt: now
  };
  db.policies.set(record.policyId, record);
  return record;
}

export function resetInMemoryDatabase(): void {
  for (const collection of [
    db.uploads,
    db.assets,
    db.jobs,
    db.steps,
    db.artifacts,
    db.events,
    db.webhooks,
    db.apiKeys,
    db.idempotency,
    db.providerCalls,
    db.usage,
    db.dlq,
    db.voiceConsents,
    db.policies
  ]) {
    collection.clear();
  }
}

function sanitizeUpload(upload: UploadInternal): TUploadSession {
  const clone = { ...upload } as UploadInternal & { parts?: UploadPartInternal[] };
  Reflect.deleteProperty(clone, "parts");
  return clone;
}

function sanitizeApiKey(key: ApiKeyLookupRecord): TApiKeyRecord {
  const clone = { ...key } as ApiKeyLookupRecord & { keyHash?: string };
  Reflect.deleteProperty(clone, "keyHash");
  return clone;
}
