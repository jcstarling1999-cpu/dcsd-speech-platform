# 12) Cost Controls + Autoscaling

Last updated: 2026-04-15

## Cost Modes
- economy: prioritize low-cost providers/local engines.
- balanced: default mix of quality, latency, and cost.
- premium: high-quality voices/models within budget guardrails.
- pinned: user-selected provider/model route.

## Guardrails
- Tenant daily/monthly budget thresholds with warning + hard-stop modes.
- Per-job estimated cost preflight before execution.
- Fallback to lower-cost provider when policy allows.

## Autoscaling Strategy
- Scale workers by queue depth and queue oldest age.
- Separate autoscaling classes:
  - ingest/extract
  - stt/tts/ocr/convert
  - merge/webhook
- Apply provider token-bucket throttles to avoid noisy-neighbor provider abuse.

## Backpressure
- Admission control returns HTTP 429 with retry hints when queue pressure is high.
- Prioritize in-flight merge and webhook completion over new low-priority jobs.
