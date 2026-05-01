# Security, Privacy, Compliance Baseline

Last updated: 2026-04-15

## Controls Implemented in Scaffold
- Auth: JWT and API-key modes.
- RBAC: role-based permission checks.
- Signed upload URLs with expiration and signatures.
- Structured log redaction for PII-bearing fields.
- Idempotency records to reduce replay abuse.
- Audit-friendly event stream for jobs/artifacts.

## Required Production Integrations
- Malware scanning hook in upload completion path.
- WAF/rate-limit policy in front of API.
- Secret manager + key rotation automation.
- At-rest encryption for DB/object store.
- Webhook signature verification and replay protection for consumers.

## Voice Cloning Consent
- Consent records are modeled (`voice_consents` migration/table).
- Voice cloning workflows must require explicit signed consent and auditable evidence URI before execution.
