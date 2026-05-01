import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransition,
  chunkTextForSynthesis,
  computeBackoff,
  defaultRouteForJobType,
  findConversionPath,
  makeProviderCallIdempotencyKey,
  makeStepIdempotencyKey
} from "../../packages/workflow/src/index.js";

test("workflow transitions and route defaults", () => {
  assert.equal(canTransition("queued", "planning"), true);
  assert.equal(canTransition("queued", "succeeded"), false);

  assert.deepEqual(defaultRouteForJobType({ type: "stt", mode: "balanced" }), [
    "stt.azure",
    "stt.google",
    "stt.aws",
    "stt.whisper.local"
  ]);

  assert.deepEqual(defaultRouteForJobType({ type: "tts", mode: "premium" })[0], "tts.azure");
});

test("text chunking and backoff", () => {
  const chunks = chunkTextForSynthesis("one two three four five six seven", 10);
  assert.ok(chunks.length > 2);
  const first = chunks[0];
  assert.ok(first);
  assert.ok(first.text.length <= 10);

  const backoff = computeBackoff(100, 3, 2000, 0);
  assert.equal(backoff, 800);
});

test("conversion path and idempotency key helpers", () => {
  const path = findConversionPath("docx", "txt");
  assert.ok(path);
  assert.equal(path?.edges.length, 1);
  assert.equal(path?.lossy, true);

  assert.equal(makeStepIdempotencyKey("job-1", "tts", 2), "step:job-1:tts:attempt:2");
  assert.equal(makeProviderCallIdempotencyKey("job-1", "tts.azure", "synthesize"), "provider-call:job-1:tts.azure:synthesize");
});
