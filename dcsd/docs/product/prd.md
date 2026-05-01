# 1) PRD — Auralith Speech Platform

- Status: Implementation-aligned
- Owner: Product + Platform Engineering
- Last updated: 2026-04-15
- Cloud baseline: Azure-primary with multi-provider failover

## Product Summary
Auralith is a production speech platform for TTS, STT, OCR-to-speech, and file conversion with resilient large-file processing. The system provides real-time, streaming, and batch workflows via UI + API with strict idempotency and job orchestration.

## Personas
1. Content Operations Lead
- Runs large podcast/video pipelines and needs reliable long-form STT + TTS.

2. Accessibility Publisher
- Converts scanned docs and mixed media into multilingual listening outputs.

3. Developer Platform Integrator
- Uses APIs/webhooks and needs normalized provider behavior, retries, and observability.

4. Compliance and Support Operator
- Audits sensitive workflows, triages failures, and enforces policy controls.

## JTBD
- When I upload a large file, I want resumable progress and recoverable jobs so failures do not require restart.
- When I need transcript/audio quickly, I want partial artifacts while the final merge continues.
- When providers fail or throttle, I want deterministic fallback with transparent reason codes.
- When conversion is lossy/impossible, I want clear path explanations and nearest alternatives.

## Core Workflows
1. Live microphone transcription
- Start stream, receive partial/final segments, export transcript and subtitle formats.

2. Huge upload and async processing
- Multipart upload -> completion -> idempotent job submission -> realtime job status -> artifacts.

3. OCR to speech
- Upload image/PDF -> OCR extract with confidence cues -> optional translation -> chunked TTS -> merged output.

4. Conversion graph
- Select `A -> B`, inspect conversion path and lossy flags, execute graph, download output + manifest.

5. Error recovery
- Retry failed jobs, keep existing successful artifacts, preserve audit history and idempotency.

## Functional Requirements
- Upload: resumable multipart, checksum support, safe type detection, malware scan hook.
- Convert: graph pathing, lossy disclosure, alternatives when unsupported.
- Transcribe: realtime + batch, timestamps, language controls.
- Generate Voice: long text chunking + progressive playback + merged final output.
- Jobs: detailed state timeline, per-step provider info, retry/cancel.
- API Keys/Webhooks: tenant-scoped auth, event signatures, replay-safe IDs.

## Non-Functional Requirements
- Availability target (job submission plane): 99.9%.
- API p95 target (control plane): <300ms.
- Webhook success within 24h: >=99.5%.
- PII-aware logging redaction on all structured events.

## Acceptance Criteria
1. Upload + resume
- Given interrupted multipart upload, when user resumes with same `uploadId`, then already uploaded parts are not re-sent.

2. Idempotent job submission
- Given same `(tenant, endpoint, idempotency-key)`, repeated POST returns same `jobId`.

3. Provider failover
- Given primary route failure (429/5xx/unsupported limit), workflow falls back to next adapter and records failover reason.

4. Progressive artifact delivery
- Given long STT/TTS job, partial artifact events are emitted before final artifact completion.

5. Security baseline
- Auth, RBAC, signed URLs, audit events, and redaction are enforced on sensitive operations.

## Out of Scope (Current Release)
- In-app waveform editor and DAW-grade timeline tooling.
- Human annotation platform for transcript correction.
- Fully automated voice cloning (enabled only with explicit consent trails).
