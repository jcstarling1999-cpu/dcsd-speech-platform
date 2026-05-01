# Information Architecture

Last updated: 2026-04-15

## Primary Navigation
1. Upload
- Create multipart sessions
- Resume/incomplete uploads
- Validation and file-type detection summary

2. Convert
- Source/target format chooser
- Conversion graph visualization
- Lossy/impossible path explanations

3. Transcribe
- Realtime microphone sessions
- Batch file STT settings
- Transcript/subtitle outputs

4. Generate Voice
- Text/OCR input
- Voice and locale controls
- Chunk progress + merged artifact

5. Jobs
- Unified job timeline
- Per-step provider attempts and retries
- Partial/final artifact list

6. API Keys
- Create/revoke keys
- Scope management
- Last-used metadata

7. Settings
- Webhook endpoints and signing
- Routing defaults (economy/balanced/premium/pinned)
- Tenant policy controls and retention settings

## Supporting Information Surfaces
- Global status bar: queue depth, latency, provider health summary.
- Alert panel: throttling, retry escalation, DLQ visibility.
- Audit trail panel: key events (auth changes, consent, key rotation).
