# 13) Deployment

Last updated: 2026-04-15

## Local Development
1. `npm install`
2. `npm run typecheck`
3. `npm run test`
4. `npm run dev`

## Cloud Topology (Azure-Primary)
- Frontend: CDN + static app hosting.
- API/orchestrator/workers: container apps or AKS workloads.
- Queue: managed queue service.
- DB: managed PostgreSQL with HA and backups.
- Object storage: encrypted buckets/containers with lifecycle policies.
- Cache: managed Redis.

## Security Baseline
- TLS in transit, encryption at rest (KMS/Key Vault-backed).
- Secret manager for provider credentials.
- Signed URL TTL defaults:
  - upload PUT: 15 minutes
  - artifact GET: 10 minutes
- RBAC and audit events for sensitive operations.

## Rollout Strategy
- Migration-first deployment for additive schema changes.
- API blue/green deployment.
- Adapter/worker canary rollout.
- Rollback keeps idempotency and queue replay safety.
