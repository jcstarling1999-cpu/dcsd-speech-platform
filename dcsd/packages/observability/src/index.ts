import { randomUUID } from "node:crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEvent {
  level: LogLevel;
  service: string;
  message: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  fields?: Record<string, unknown>;
}

const SENSITIVE_FIELD_PATTERN = /(email|phone|ssn|token|secret|authorization|password|api[_-]?key|cookie|set-cookie)/i;

export function redactPII(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SENSITIVE_FIELD_PATTERN.test(key)) {
      out[key] = "[REDACTED]";
      continue;
    }
    if (typeof value === "string" && value.length > 512) {
      out[key] = `${value.slice(0, 512)}...[truncated]`;
      continue;
    }
    out[key] = value;
  }
  return out;
}

export function log(event: LogEvent): void {
  const payload = {
    timestamp: new Date().toISOString(),
    ...event,
    fields: event.fields ? redactPII(event.fields) : undefined
  };
  console.log(JSON.stringify(payload));
}

const metrics = new Map<string, number>();

export function incrementMetric(name: string, by = 1): void {
  metrics.set(name, (metrics.get(name) ?? 0) + by);
}

export function setMetric(name: string, value: number): void {
  metrics.set(name, value);
}

export function snapshotMetrics(): Record<string, number> {
  return Object.fromEntries(metrics.entries());
}

export interface TraceContext {
  traceId: string;
  spanId: string;
}

export function startTrace(existingTraceId?: string): TraceContext {
  return {
    traceId: existingTraceId ?? randomUUID(),
    spanId: randomUUID()
  };
}
