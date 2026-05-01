import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { buildServer } from "../../apps/api/src/index.js";
import { resetInMemoryDatabase } from "../../packages/database/src/index.js";

function devHeaders(tenantId: string, userId: string): Record<string, string> {
  return {
    "x-tenant-id": tenantId,
    "x-user-id": userId,
    "x-role": "owner",
    "content-type": "application/json"
  };
}

test("api upload and job contracts", async () => {
  resetInMemoryDatabase();
  const app = buildServer();

  const tenantId = randomUUID();
  const userId = randomUUID();

  const uploadRes = await app.inject({
    method: "POST",
    url: "/v1/uploads",
    headers: devHeaders(tenantId, userId),
    payload: {
      tenantId,
      userId,
      filename: "sample.wav",
      sizeBytes: 32 * 1024 * 1024,
      contentType: "audio/wav",
      checksumSha256: "a".repeat(64),
      chunkSizeBytes: 8 * 1024 * 1024
    }
  });

  assert.equal(uploadRes.statusCode, 201);
  const uploadBody = uploadRes.json();
  assert.ok(uploadBody.upload.uploadId);

  const partRes = await app.inject({
    method: "POST",
    url: `/v1/uploads/${uploadBody.upload.uploadId}/parts`,
    headers: devHeaders(tenantId, userId),
    payload: {
      partNumber: 1,
      partChecksumSha256: "b".repeat(64)
    }
  });

  assert.equal(partRes.statusCode, 200);

  const completeRes = await app.inject({
    method: "POST",
    url: `/v1/uploads/${uploadBody.upload.uploadId}/complete`,
    headers: devHeaders(tenantId, userId),
    payload: {
      parts: [{ partNumber: 1, etag: "etag-1" }]
    }
  });

  assert.equal(completeRes.statusCode, 200);
  const completeBody = completeRes.json();
  assert.ok(completeBody.asset.assetId);

  const jobRes = await app.inject({
    method: "POST",
    url: "/v1/jobs",
    headers: devHeaders(tenantId, userId),
    payload: {
      idempotencyKey: "idem-12345678",
      tenantId,
      userId,
      fileId: completeBody.asset.assetId,
      type: "stt",
      options: { routingMode: "balanced" }
    }
  });

  assert.equal(jobRes.statusCode, 202);
  const jobBody = jobRes.json();
  assert.ok(jobBody.jobId);

  const statusRes = await app.inject({
    method: "GET",
    url: `/v1/jobs/${jobBody.jobId}`,
    headers: devHeaders(tenantId, userId)
  });

  assert.equal(statusRes.statusCode, 200);

  await app.close();
});
