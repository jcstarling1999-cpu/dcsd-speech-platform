import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryQueueClient, TokenBucket } from "../../packages/queue/src/index.js";

test("queue enqueue poll ack", async () => {
  const queue = new InMemoryQueueClient();
  const enqueued = await queue.enqueue({
    queue: "stt",
    dedupeKey: "tenant:idem",
    payload: { hello: "world" }
  });

  const messages = await queue.poll("stt", 10);
  assert.equal(messages.length, 1);
  const first = messages[0];
  assert.ok(first);
  assert.equal(first.id, enqueued.id);

  await queue.ack("stt", first.id);
  assert.equal(queue.snapshot().queueDepth.stt ?? 0, 0);
});

test("queue retry and dlq", async () => {
  const queue = new InMemoryQueueClient();
  await queue.enqueue({ queue: "tts", dedupeKey: "a", payload: {}, maxAttempts: 1 });
  const [message] = await queue.poll("tts", 1);
  assert.ok(message);
  await queue.retry("tts", message.id, 0, "failure");
  assert.equal(queue.listDeadLetters().length, 1);
});

test("token bucket", async () => {
  const bucket = new TokenBucket({ capacity: 1, refillPerSecond: 1000 });
  assert.equal(bucket.tryTake(1), true);
  assert.equal(bucket.tryTake(1), false);
});
