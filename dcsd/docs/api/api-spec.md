# 6) API Spec (REST + WebSocket + Webhooks)

Version: v1
Last updated: 2026-04-15

## Authentication
- JWT bearer: `Authorization: Bearer <token>`
- API key: `x-api-key: <key>`
- Dev mode only: `x-tenant-id`, `x-user-id`, `x-role`

## REST

### POST `/v1/uploads`
Create multipart upload session.

Request:
```json
{
  "tenantId": "uuid",
  "userId": "uuid",
  "filename": "meeting.wav",
  "sizeBytes": 1073741824,
  "contentType": "audio/wav",
  "checksumSha256": "...64hex...",
  "chunkSizeBytes": 16777216
}
```

Response `201`:
```json
{
  "upload": {
    "uploadId": "uuid",
    "expectedParts": 64,
    "status": "uploading"
  },
  "detected": {
    "family": "audio",
    "likelyNeedsOcr": false
  },
  "next": {
    "signPart": "/v1/uploads/{uploadId}/parts",
    "complete": "/v1/uploads/{uploadId}/complete"
  }
}
```

### POST `/v1/uploads/{uploadId}/parts`
Get signed URL for a part.

### POST `/v1/uploads/{uploadId}/complete`
Finalize multipart upload and create asset.

### POST `/v1/jobs`
Submit async job with idempotency.

Request:
```json
{
  "idempotencyKey": "unique-key",
  "tenantId": "uuid",
  "userId": "uuid",
  "fileId": "uuid",
  "type": "stt",
  "options": {
    "routingMode": "balanced",
    "partialArtifactMode": true
  }
}
```

Response `202`:
```json
{
  "jobId": "uuid",
  "status": "queued",
  "route": ["stt.azure", "stt.google", "stt.aws"]
}
```

### GET `/v1/jobs`
List jobs for authenticated tenant.

### GET `/v1/jobs/{jobId}`
Return `job`, `steps`, and `artifacts`.

### POST `/v1/jobs/{jobId}/cancel`
Cancel active job.

### POST `/v1/jobs/{jobId}/retry`
Requeue failed/canceled job.

### GET `/v1/providers/capabilities`
Return normalized adapter capabilities grouped by `stt|tts|ocr|convert`.

### POST `/v1/webhooks`
Create webhook endpoint and return secret once.

### GET `/v1/webhooks`
List webhook endpoints.

### POST `/v1/api-keys`
Create tenant API key.

### GET `/v1/api-keys`
List tenant API keys.

## WebSocket
- Endpoint: `/v1/ws`
- Events:
  - `upload.progress`
  - `job.updated`
  - `job.step.updated`
  - `artifact.ready`
  - `job.failed`

Envelope:
```json
{
  "eventId": "uuid",
  "tenantId": "uuid",
  "jobId": "uuid",
  "type": "job.updated",
  "sequence": 42,
  "timestamp": "2026-04-15T07:00:00.000Z",
  "payload": {
    "status": "running",
    "progress": 0.52
  }
}
```

## Webhooks
Events:
- `job.created`
- `job.running`
- `job.succeeded`
- `job.failed`
- `artifact.ready`

Delivery contract:
- `X-Event-Id`: unique event UUID
- `X-Signature`: HMAC-SHA256 payload signature
- Retry: exponential up to 24h
- Idempotency: consumer should dedupe by `X-Event-Id`

## Error Contract
```json
{
  "code": "VALIDATION_ERROR",
  "message": "invalid request",
  "issues": []
}
```
