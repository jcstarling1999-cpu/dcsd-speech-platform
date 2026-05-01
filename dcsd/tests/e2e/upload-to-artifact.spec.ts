import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { buildServer } from "../../apps/api/src/index.js";
import { resetInMemoryDatabase } from "../../packages/database/src/index.js";

function headers(tenantId: string, userId: string): Record<string, string> {
  return {
    "x-tenant-id": tenantId,
    "x-user-id": userId,
    "x-role": "owner",
    "content-type": "application/json"
  };
}

test("e2e upload -> complete -> submit job -> artifact readiness", async () => {
  resetInMemoryDatabase();
  const app = buildServer();

  const tenantId = randomUUID();
  const userId = randomUUID();

  const upload = await app.inject({
    method: "POST",
    url: "/v1/uploads",
    headers: headers(tenantId, userId),
    payload: {
      tenantId,
      userId,
      filename: "meeting.mp3",
      sizeBytes: 4 * 1024 * 1024,
      contentType: "audio/mpeg",
      checksumSha256: "c".repeat(64),
      chunkSizeBytes: 2 * 1024 * 1024
    }
  });

  const uploadBody = upload.json();

  const complete = await app.inject({
    method: "POST",
    url: `/v1/uploads/${uploadBody.upload.uploadId}/complete`,
    headers: headers(tenantId, userId),
    payload: {
      parts: [
        { partNumber: 1, etag: "etag-1" },
        { partNumber: 2, etag: "etag-2" }
      ]
    }
  });

  const assetId = complete.json().asset.assetId;

  const submit = await app.inject({
    method: "POST",
    url: "/v1/jobs",
    headers: headers(tenantId, userId),
    payload: {
      idempotencyKey: `idem-${Date.now()}`,
      tenantId,
      userId,
      fileId: assetId,
      type: "stt",
      options: { routingMode: "balanced", partialArtifactMode: true }
    }
  });

  const jobId = submit.json().jobId;

  let status = "queued";
  for (let i = 0; i < 8; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 320));
    const jobRes = await app.inject({ method: "GET", url: `/v1/jobs/${jobId}`, headers: headers(tenantId, userId) });
    const body = jobRes.json();
    status = body.job.status;
    if (status === "succeeded") {
      assert.ok(body.artifacts.length >= 1);
      break;
    }
  }

  assert.equal(status, "succeeded");

  await app.close();
});
