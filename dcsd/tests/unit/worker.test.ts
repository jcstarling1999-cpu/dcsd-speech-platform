import assert from "node:assert/strict";
import test from "node:test";
import { processWorkerJob } from "../../apps/worker/src/index.js";

test("worker returns retry and ack outcomes", async () => {
  const retry = await processWorkerJob({
    jobId: "job-1",
    stepId: "step-1",
    attempt: 0,
    queue: "stt",
    payload: { forceRetry: true }
  });

  assert.equal(retry.outcome, "retry");

  const ack = await processWorkerJob({
    jobId: "job-1",
    stepId: "step-2",
    attempt: 0,
    queue: "stt",
    payload: {}
  });

  assert.equal(ack.outcome, "ack");
});
