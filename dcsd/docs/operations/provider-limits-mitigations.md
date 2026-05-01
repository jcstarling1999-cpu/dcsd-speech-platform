# 14) Known Limits + Mitigations by Provider

Last updated: 2026-04-15

## Azure Speech
Known limits:
- Request and concurrency quotas are resource/region dependent.
Mitigations:
- Chunking, multi-resource routing, retry with jitter, region fallback.

## Google Speech / TTS / OCR
Known limits:
- Project/location quotas and per-request limits vary by API version.
Mitigations:
- Preflight request sizing, async batch for long inputs, route-by-location.

## AWS Transcribe / Polly / Textract
Known limits:
- Service quotas vary by account/region and mode.
Mitigations:
- Queue decoupling, S3/object staging patterns, policy-based fallback.

## Speechify
Known limits:
- Throughput and character limits can be plan-dependent.
Mitigations:
- Chunk text by provider max chars, respect `Retry-After`, premium fallback role only.

## Apple Native STT/TTS
Known limits:
- Device/OS runtime and permissions.
Mitigations:
- Runtime capability detection; cloud fallback when native path unavailable.

## Local OCR / Conversion Stack
Known limits:
- Host CPU/memory bound; variable fidelity for office conversions.
Mitigations:
- Dedicated worker pools, sandboxed execution, explicit unsupported-path alternatives.

## Cross-Provider Strategy
- Never claim unlimited provider limits.
- No arbitrary product file-size cap; orchestration handles very large payloads via multipart, chunking, and resumable jobs.
