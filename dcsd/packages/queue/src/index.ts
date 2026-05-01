import { randomUUID } from "node:crypto";
import type { TQueueName } from "@platform/contracts/src/index.js";
import { Redis } from "@upstash/redis";

export interface QueueMessage<TPayload = Record<string, unknown>> {
  id: string;
  queue: TQueueName;
  dedupeKey: string;
  attempt: number;
  maxAttempts: number;
  availableAt: number;
  enqueuedAt: string;
  payload: TPayload;
}

export interface DeadLetterMessage<TPayload = Record<string, unknown>> {
  id: string;
  queue: TQueueName;
  dedupeKey: string;
  payload: TPayload;
  attempts: number;
  reason: string;
  deadLetteredAt: string;
}

export interface EnqueueInput<TPayload = Record<string, unknown>> {
  queue: TQueueName;
  dedupeKey: string;
  payload: TPayload;
  maxAttempts?: number;
  delayMs?: number;
}

export interface QueueClient {
  enqueue<TPayload>(input: EnqueueInput<TPayload>): Promise<QueueMessage<TPayload>>;
  poll(queue: TQueueName, maxItems: number): Promise<QueueMessage[]>;
  ack(queue: TQueueName, id: string): Promise<void>;
  retry(queue: TQueueName, id: string, backoffMs: number, reason: string): Promise<void>;
  deadLetter(queue: TQueueName, id: string, reason: string): Promise<void>;
  snapshot(): { queueDepth: Record<string, number>; dlqDepth: number };
  listDeadLetters(): DeadLetterMessage[];
}

export class InMemoryQueueClient implements QueueClient {
  private readonly queues = new Map<TQueueName, QueueMessage[]>();
  private readonly inFlight = new Map<TQueueName, Map<string, QueueMessage>>();
  private readonly dedupe = new Set<string>();
  private readonly deadLetters: DeadLetterMessage[] = [];

  async enqueue<TPayload>(input: EnqueueInput<TPayload>): Promise<QueueMessage<TPayload>> {
    const dedupeKey = `${input.queue}:${input.dedupeKey}`;
    if (this.dedupe.has(dedupeKey)) {
      const existing = this.findByDedupe(dedupeKey);
      if (existing) {
        return existing as QueueMessage<TPayload>;
      }
    }

    const message: QueueMessage<TPayload> = {
      id: randomUUID(),
      queue: input.queue,
      dedupeKey: input.dedupeKey,
      attempt: 0,
      maxAttempts: input.maxAttempts ?? 5,
      availableAt: Date.now() + (input.delayMs ?? 0),
      enqueuedAt: new Date().toISOString(),
      payload: input.payload
    };

    const targetQueue = this.queues.get(input.queue) ?? [];
    targetQueue.push(message as QueueMessage);
    this.queues.set(input.queue, targetQueue);
    this.dedupe.add(dedupeKey);
    return message;
  }

  async poll(queue: TQueueName, maxItems: number): Promise<QueueMessage[]> {
    const now = Date.now();
    const targetQueue = this.queues.get(queue) ?? [];
    const ready: QueueMessage[] = [];
    const pending: QueueMessage[] = [];

    for (const msg of targetQueue) {
      if (ready.length < maxItems && msg.availableAt <= now) {
        ready.push(msg);
      } else {
        pending.push(msg);
      }
    }

    this.queues.set(queue, pending);

    const inFlightQueue = this.inFlight.get(queue) ?? new Map<string, QueueMessage>();
    for (const msg of ready) {
      inFlightQueue.set(msg.id, msg);
    }
    this.inFlight.set(queue, inFlightQueue);

    return ready;
  }

  async ack(queue: TQueueName, id: string): Promise<void> {
    const inFlightQueue = this.inFlight.get(queue);
    if (!inFlightQueue) {
      return;
    }
    const msg = inFlightQueue.get(id);
    if (!msg) {
      return;
    }

    inFlightQueue.delete(id);
    this.dedupe.delete(`${queue}:${msg.dedupeKey}`);
  }

  async retry(queue: TQueueName, id: string, backoffMs: number, _reason: string): Promise<void> {
    const inFlightQueue = this.inFlight.get(queue);
    const msg = inFlightQueue?.get(id);
    if (!msg || !inFlightQueue) {
      return;
    }

    const nextAttempt = msg.attempt + 1;
    if (nextAttempt >= msg.maxAttempts) {
      inFlightQueue.delete(id);
      this.deadLetters.push({
        id: msg.id,
        queue,
        dedupeKey: msg.dedupeKey,
        payload: msg.payload,
        attempts: msg.attempt,
        reason: "MAX_RETRIES_EXCEEDED",
        deadLetteredAt: new Date().toISOString()
      });
      this.dedupe.delete(`${queue}:${msg.dedupeKey}`);
      return;
    }

    inFlightQueue.delete(id);
    const retryMessage: QueueMessage = {
      ...msg,
      attempt: nextAttempt,
      availableAt: Date.now() + backoffMs
    };

    const targetQueue = this.queues.get(queue) ?? [];
    targetQueue.push(retryMessage);
    this.queues.set(queue, targetQueue);
  }

  async deadLetter(queue: TQueueName, id: string, reason: string): Promise<void> {
    const inFlightQueue = this.inFlight.get(queue);
    const msg = inFlightQueue?.get(id);
    if (!msg || !inFlightQueue) {
      return;
    }

    inFlightQueue.delete(id);
    this.deadLetters.push({
      id: msg.id,
      queue,
      dedupeKey: msg.dedupeKey,
      payload: msg.payload,
      attempts: msg.attempt,
      reason,
      deadLetteredAt: new Date().toISOString()
    });
    this.dedupe.delete(`${queue}:${msg.dedupeKey}`);
  }

  snapshot(): { queueDepth: Record<string, number>; dlqDepth: number } {
    const queueDepth: Record<string, number> = {};
    for (const [queue, messages] of this.queues.entries()) {
      queueDepth[queue] = messages.length;
    }

    return {
      queueDepth,
      dlqDepth: this.deadLetters.length
    };
  }

  listDeadLetters(): DeadLetterMessage[] {
    return [...this.deadLetters];
  }

  private findByDedupe(dedupeKey: string): QueueMessage | undefined {
    for (const messages of this.queues.values()) {
      const found = messages.find((msg) => `${msg.queue}:${msg.dedupeKey}` === dedupeKey);
      if (found) {
        return found;
      }
    }

    for (const inFlight of this.inFlight.values()) {
      for (const msg of inFlight.values()) {
        if (`${msg.queue}:${msg.dedupeKey}` === dedupeKey) {
          return msg;
        }
      }
    }

    return undefined;
  }
}

interface UpstashQueueRecord {
  id: string;
  queue: TQueueName;
  dedupeKey: string;
  attempt: number;
  maxAttempts: number;
  availableAt: number;
  enqueuedAt: string;
  payload: Record<string, unknown>;
}

interface UpstashDlqRecord {
  id: string;
  queue: TQueueName;
  dedupeKey: string;
  payload: Record<string, unknown>;
  attempts: number;
  reason: string;
  deadLetteredAt: string;
}

export class UpstashQueueClient implements QueueClient {
  private readonly redis: Redis;
  private readonly namespace: string;

  constructor(params: { url: string; token: string; namespace?: string }) {
    this.redis = new Redis({ url: params.url, token: params.token });
    this.namespace = params.namespace ?? "dcsd:queue:v1";
  }

  async enqueue<TPayload>(input: EnqueueInput<TPayload>): Promise<QueueMessage<TPayload>> {
    const now = Date.now();
    const dedupeKey = `${input.queue}:${input.dedupeKey}`;
    const dedupeRedisKey = this.key("dedupe", dedupeKey);
    const existingId = await this.redis.get<string>(dedupeRedisKey);
    if (existingId) {
      const existing = await this.redis.get<UpstashQueueRecord>(this.key("message", existingId));
      if (existing) {
        return existing as unknown as QueueMessage<TPayload>;
      }
    }

    const record: UpstashQueueRecord = {
      id: randomUUID(),
      queue: input.queue,
      dedupeKey: input.dedupeKey,
      attempt: 0,
      maxAttempts: input.maxAttempts ?? 5,
      availableAt: now + (input.delayMs ?? 0),
      enqueuedAt: new Date(now).toISOString(),
      payload: input.payload as Record<string, unknown>
    };

    await this.redis.set(this.key("message", record.id), record);
    await this.redis.zadd(this.key("ready", input.queue), { score: record.availableAt, member: record.id });
    await this.redis.set(dedupeRedisKey, record.id);
    return record as unknown as QueueMessage<TPayload>;
  }

  async poll(queue: TQueueName, maxItems: number): Promise<QueueMessage[]> {
    const now = Date.now();
    const readyKey = this.key("ready", queue);
    const inFlightKey = this.key("inflight", queue);
    const candidates = await this.redis.zrange<string[]>(readyKey, 0, now, { byScore: true });
    const messageIds = candidates.slice(0, maxItems);

    const items: QueueMessage[] = [];
    for (const id of messageIds) {
      await this.redis.zrem(readyKey, id);
      await this.redis.sadd(inFlightKey, id);
      const msg = await this.redis.get<UpstashQueueRecord>(this.key("message", id));
      if (msg) {
        items.push(msg as unknown as QueueMessage);
      }
    }
    return items;
  }

  async ack(queue: TQueueName, id: string): Promise<void> {
    const msg = await this.redis.get<UpstashQueueRecord>(this.key("message", id));
    if (!msg) {
      return;
    }
    await this.redis.srem(this.key("inflight", queue), id);
    await this.redis.del(this.key("message", id));
    await this.redis.del(this.key("dedupe", `${queue}:${msg.dedupeKey}`));
  }

  async retry(queue: TQueueName, id: string, backoffMs: number, _reason: string): Promise<void> {
    const msg = await this.redis.get<UpstashQueueRecord>(this.key("message", id));
    if (!msg) {
      return;
    }

    const nextAttempt = msg.attempt + 1;
    await this.redis.srem(this.key("inflight", queue), id);

    if (nextAttempt >= msg.maxAttempts) {
      const dlq: UpstashDlqRecord = {
        id: msg.id,
        queue,
        dedupeKey: msg.dedupeKey,
        payload: msg.payload,
        attempts: msg.attempt,
        reason: "MAX_RETRIES_EXCEEDED",
        deadLetteredAt: new Date().toISOString()
      };
      await this.redis.rpush(this.key("dlq"), dlq);
      await this.redis.del(this.key("message", id));
      await this.redis.del(this.key("dedupe", `${queue}:${msg.dedupeKey}`));
      return;
    }

    const updated: UpstashQueueRecord = {
      ...msg,
      attempt: nextAttempt,
      availableAt: Date.now() + backoffMs
    };
    await this.redis.set(this.key("message", id), updated);
    await this.redis.zadd(this.key("ready", queue), { score: updated.availableAt, member: id });
  }

  async deadLetter(queue: TQueueName, id: string, reason: string): Promise<void> {
    const msg = await this.redis.get<UpstashQueueRecord>(this.key("message", id));
    if (!msg) {
      return;
    }
    await this.redis.srem(this.key("inflight", queue), id);
    const dlq: UpstashDlqRecord = {
      id: msg.id,
      queue,
      dedupeKey: msg.dedupeKey,
      payload: msg.payload,
      attempts: msg.attempt,
      reason,
      deadLetteredAt: new Date().toISOString()
    };
    await this.redis.rpush(this.key("dlq"), dlq);
    await this.redis.del(this.key("message", id));
    await this.redis.del(this.key("dedupe", `${queue}:${msg.dedupeKey}`));
  }

  snapshot(): { queueDepth: Record<string, number>; dlqDepth: number } {
    return {
      queueDepth: {},
      dlqDepth: 0
    };
  }

  listDeadLetters(): DeadLetterMessage[] {
    return [];
  }

  private key(type: string, suffix = ""): string {
    return `${this.namespace}:${type}${suffix ? `:${suffix}` : ""}`;
  }
}

export function createQueueClient(env: {
  QUEUE_DRIVER?: "memory" | "upstash-rest" | "bullmq-compatible" | undefined;
  UPSTASH_REDIS_REST_URL?: string | undefined;
  UPSTASH_REDIS_REST_TOKEN?: string | undefined;
}): QueueClient {
  if (env.QUEUE_DRIVER === "memory") {
    return new InMemoryQueueClient();
  }

  if ((env.QUEUE_DRIVER === "upstash-rest" || env.QUEUE_DRIVER === "bullmq-compatible" || !env.QUEUE_DRIVER) &&
      env.UPSTASH_REDIS_REST_URL &&
      env.UPSTASH_REDIS_REST_TOKEN) {
    return new UpstashQueueClient({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN
    });
  }

  return new InMemoryQueueClient();
}

export interface TokenBucketConfig {
  capacity: number;
  refillPerSecond: number;
}

export class TokenBucket {
  private tokens: number;
  private lastRefillEpochMs: number;

  constructor(private readonly config: TokenBucketConfig) {
    this.tokens = config.capacity;
    this.lastRefillEpochMs = Date.now();
  }

  tryTake(amount = 1): boolean {
    this.refill();
    if (this.tokens < amount) {
      return false;
    }
    this.tokens -= amount;
    return true;
  }

  available(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillEpochMs) / 1_000;
    if (elapsedSeconds <= 0) {
      return;
    }

    this.tokens = Math.min(this.config.capacity, this.tokens + elapsedSeconds * this.config.refillPerSecond);
    this.lastRefillEpochMs = now;
  }
}
