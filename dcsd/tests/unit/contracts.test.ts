import assert from "node:assert/strict";
import test from "node:test";
import { SubmitJobRequest } from "../../packages/contracts/src/index.js";

test("submit job schema validates", () => {
  const result = SubmitJobRequest.safeParse({
    idempotencyKey: "abcd-1234-efgh-5678",
    tenantId: "a43b16a6-4cf2-4558-a4f4-5ffd50894bb0",
    userId: "47f2b2b7-dab5-4861-b5ce-77b6edf5eb07",
    fileId: "8f7f4fd9-7f86-4b55-8ea7-13f771790d1a",
    type: "stt",
    options: { routingMode: "balanced" }
  });

  assert.equal(result.success, true);
});
