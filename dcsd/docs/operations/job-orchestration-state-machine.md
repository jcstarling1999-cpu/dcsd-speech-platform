# 7) Job Orchestration / State Machine

Last updated: 2026-04-15

## Canonical Job States
- draft
- queued
- planning
- running
- awaiting_callback
- merging
- succeeded
- partially_succeeded
- failed
- canceled

## Transition Rules
- Transition validation is centralized.
- Invalid transition attempts generate `INVALID_STATE_TRANSITION` and are logged.
- Terminal states (`succeeded`, `failed`, `canceled`, `partially_succeeded`) are immutable.

## Step-Level Lifecycle
1. Step queued
2. Step running
3. Step awaiting callback (optional)
4. Step succeeded or failed
5. Step retried or dead-lettered

## Retry Policy
- Retry classes: network/transient provider/storage and throttling errors.
- Backoff: exponential + jitter.
- Maximum attempts:
  - provider execution: 5
  - callback polling: 10
  - webhook delivery: 12

## Dead Letter Handling
- Move failed messages to DLQ after retry budget exhaustion.
- Persist queue name, reason, payload, tenant, trace/job identifiers.
- Replay endpoint enforces idempotency and role authorization.

## Concurrency + Backpressure
- Per-tenant job concurrency caps.
- Per-provider token buckets.
- Admission throttling when queue depth/age crosses thresholds.

## Idempotency Keys
- API scope: `(tenant, endpoint, idempotency-key)`
- Step scope: `step:{job}:{stepType}:attempt:{n}`
- Provider call scope: `provider-call:{job}:{provider}:{op}`
