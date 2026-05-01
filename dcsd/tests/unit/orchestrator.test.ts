import assert from "node:assert/strict";
import test from "node:test";
import { resetInMemoryDatabase, createJobStep, createJob } from "../../packages/database/src/index.js";
import { orchestrateJob } from "../../apps/orchestrator/src/index.js";

test("orchestrator executes route", async () => {
  resetInMemoryDatabase();

  const job = createJob({
    tenantId: "a43b16a6-4cf2-4558-a4f4-5ffd50894bb0",
    userId: "47f2b2b7-dab5-4861-b5ce-77b6edf5eb07",
    fileId: "8f7f4fd9-7f86-4b55-8ea7-13f771790d1a",
    idempotencyKey: "idem-orch-123456",
    type: "stt",
    status: "queued",
    route: ["stt.azure"],
    progress: 0
  });

  const step = createJobStep({
    jobId: job.jobId,
    type: "transcribe.batch",
    status: "running",
    attempt: 0,
    queue: "stt",
    inputManifest: {},
    outputManifest: {}
  });

  await orchestrateJob({
    jobId: job.jobId,
    stepId: step.stepId,
    tenantId: job.tenantId,
    type: "stt",
    route: ["stt.azure"],
    inputUri: "s3://raw/input.wav",
    inputFormat: "wav",
    outputFormat: "json",
    locale: "en-US",
    region: "eastus",
    payloadBytes: 1024,
    durationSeconds: 10
  });

  assert.ok(true);
});
