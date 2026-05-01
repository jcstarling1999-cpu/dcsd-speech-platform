# 11) Observability

Last updated: 2026-04-15

## Logs
- JSON structured logs with PII redaction (`email`, `token`, `secret`, etc.).
- Correlation keys: `trace_id`, `request_id`, `tenant_id`, `job_id`, `step_id`, `provider`.
- Log levels: debug/info/warn/error.

## Metrics
- API: request rate, p95 latency, 4xx/5xx.
- Queue: depth, oldest age, retries, DLQ depth.
- Worker: success/failure ratio by queue/provider.
- Provider: latency, 429, 5xx, failover count.
- Cost: estimated USD by tenant/provider/day.

## Tracing
Span chain:
- api.request -> upload/job validation -> queue.enqueue
- queue.poll -> orchestrator.plan -> adapter.preflight -> adapter.execute
- merge.publish -> webhook.dispatch

## Alerts
Critical:
- job_failure_rate > 8% over 10m
- provider_429_rate > 15% over 5m
- queue_oldest_age > 15m

Warning:
- websocket_disconnect_rate > 5% over 15m
- webhook_success_24h < 99.5%

## SLO Targets
- Job submission availability: 99.9%
- Control plane API p95: < 300ms
- Artifact-ready median lag after persist: < 5s
- Webhook delivery success in 24h: >= 99.5%
