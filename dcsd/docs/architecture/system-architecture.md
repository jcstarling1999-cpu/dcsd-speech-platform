# 3) System Architecture + Diagrams

Date: 2026-04-15
Cloud baseline: Azure-primary (multi-provider adapters)

## High-Level Design
- Frontend web app + Apple-native client module
- API gateway/control plane
- Orchestration engine
- Async queues and worker pools
- Object storage for binaries
- Metadata database for job state/audit
- Cache for quotas/idempotency/session fanout
- Observability stack (logs, metrics, traces, alerts)

## Architecture Diagram
```mermaid
flowchart LR
  C[Web / API Client / Apple Client] --> API[API Gateway]
  C --> OBJ[(Object Storage)]

  API --> AUTH[Auth + RBAC]
  API --> IDEM[Idempotency Store]
  API --> DB[(Metadata DB)]
  API --> WS[WebSocket Fanout]
  API --> ORCH[Orchestration Service]

  ORCH --> Q1[[ingest/extract]]
  ORCH --> Q2[[stt/tts/ocr/convert]]
  ORCH --> Q3[[merge/callback/webhook/cleanup]]

  Q1 --> W1[Ingest Workers]
  Q2 --> W2[Speech/OCR/Convert Workers]
  Q3 --> W3[Merge/Webhook Workers]

  W1 --> ADPT[Provider Adapter Layer]
  W2 --> ADPT
  W3 --> ADPT

  ADPT --> AZ[Azure APIs]
  ADPT --> GG[Google APIs]
  ADPT --> AWS[AWS APIs]
  ADPT --> LOC[Local Engines]
  ADPT --> SP[Speechify]

  W1 --> OBJ
  W2 --> OBJ
  W3 --> OBJ

  API --> OBS[Logs / Metrics / Traces]
  ORCH --> OBS
  W1 --> OBS
  W2 --> OBS
  W3 --> OBS

  ORCH --> WHQ[[Webhook Queue]]
  WHQ --> WH[Customer Webhook Endpoints]
```

## Job State Machine
```mermaid
stateDiagram-v2
  [*] --> draft
  draft --> queued
  queued --> planning
  planning --> running
  running --> awaiting_callback
  awaiting_callback --> running
  running --> merging
  merging --> succeeded

  running --> partially_succeeded
  running --> failed
  planning --> failed
  awaiting_callback --> failed

  queued --> canceled
  planning --> canceled
  running --> canceled

  succeeded --> [*]
  partially_succeeded --> [*]
  failed --> [*]
  canceled --> [*]
```

## Queue / Retry / DLQ Policy
- Retryable: network timeouts, transient storage errors, provider 429/5xx.
- Non-retryable: validation errors, unsupported formats, forbidden policy routes.
- Backoff: exponential + jitter (`base * 2^attempt + jitter`), capped per class.
- DLQ on exhausted retries with payload + tenant + trace context.
- Replay only through operator/admin endpoint with idempotency protection.

## Concurrency + Backpressure
- Per-tenant concurrent job caps.
- Per-provider token bucket limits.
- Admission throttling on queue age/depth thresholds.
- Degraded mode: prioritize in-progress merges + webhook delivery.

## Idempotency Strategy
- External API scope: `(tenantId, endpoint, idempotency-key)`.
- Step scope: `step:{jobId}:{stepType}:attempt:{n}`.
- Provider call scope: `provider-call:{jobId}:{provider}:{operation}`.

## Partial Result Pipeline
- Long jobs emit partial artifacts (`transcript.partial`, `audio.partial`) before merge.
- Clients receive `artifact.ready` websocket/webhook events per stage.
- Final merge publishes immutable artifact manifest with component lineage.
