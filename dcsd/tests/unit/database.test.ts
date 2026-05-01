import assert from "node:assert/strict";
import test from "node:test";
import {
  completeUpload,
  createJob,
  createUploadSession,
  getAsset,
  getUploadSession,
  listJobsByTenant,
  resetInMemoryDatabase,
  updateJobStatus
} from "../../packages/database/src/index.js";

test("database upload and job lifecycle", () => {
  resetInMemoryDatabase();

  const upload = createUploadSession({
    tenantId: "4ef57ec7-78df-4b02-9e92-b50ac8f8d662",
    userId: "171592f8-f4e4-40e9-bf96-f1a0ab5e1b6e",
    filename: "sample.wav",
    contentType: "audio/wav",
    sizeBytes: 100,
    checksumSha256: "f".repeat(64),
    chunkSizeBytes: 10,
    expectedParts: 10,
    storageKey: "raw/sample.wav"
  });

  assert.ok(getUploadSession(upload.uploadId));

  const { asset } = completeUpload(upload.uploadId, [{ partNumber: 1, etag: "etag-1" }]);
  assert.ok(getAsset(asset.assetId));

  const job = createJob({
    tenantId: upload.tenantId,
    userId: upload.userId,
    fileId: asset.assetId,
    idempotencyKey: "idem-12345678",
    type: "stt",
    status: "queued",
    route: ["stt.azure"],
    progress: 0
  });

  const updated = updateJobStatus(job.jobId, "running", 0.3);
  assert.equal(updated.status, "running");
  assert.equal(listJobsByTenant(upload.tenantId).length, 1);
});
