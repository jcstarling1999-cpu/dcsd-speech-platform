import assert from "node:assert/strict";
import test from "node:test";
import { byType, executeWithFallback } from "../../packages/adapters/src/index.js";

test("adapter registry grouped by type", () => {
  assert.ok(byType("stt").length >= 1);
  assert.ok(byType("tts").length >= 1);
  assert.ok(byType("ocr").length >= 1);
  assert.ok(byType("convert").length >= 2);
});

test("fallback execution returns normalized result", async () => {
  const result = await executeWithFallback(["stt.azure", "stt.google"], {
    jobId: "job-a",
    stepId: "step-a",
    inputUri: "s3://raw/sample.wav",
    inputFormat: "wav",
    outputFormat: "json",
    locale: "en-US",
    region: "eastus",
    payloadBytes: 1024,
    durationSeconds: 10,
    options: {}
  });

  assert.equal(result.provider, "stt.azure");
  assert.ok(result.outputUris.length > 0);
  assert.ok(result.metrics.estimatedCostUsd > 0);
});
