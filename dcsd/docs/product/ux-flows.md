# UX Flows

Last updated: 2026-04-15

## 1. Mic Live Transcription
1. User opens Transcribe -> Live mode.
2. Browser permission prompt; denied state offers troubleshooting.
3. Session starts with live partial transcript.
4. User pauses/resumes; chunks are timestamped.
5. Final transcript and subtitle exports become available.

Recovery states:
- Network interruption: show reconnect + buffered text state.
- Provider 429: switch to fallback route, display continuity notice.

## 2. Huge File Upload
1. User creates upload session with file metadata and checksum.
2. UI uploads chunked parts via signed URLs.
3. Failed parts retry independently.
4. Completion call finalizes upload and creates asset.

Recovery states:
- App close/reopen: fetch `uploadId` and continue remaining parts.
- Expired signed URL: request new per-part URL, continue without reset.

## 3. OCR -> Speech
1. User uploads scan/PDF.
2. System runs OCR route with confidence metadata.
3. User optionally edits text/translation settings.
4. TTS begins chunk synthesis with partial playback.
5. Merge finishes and final audio artifact is published.

Recovery states:
- Low OCR confidence: suggest cloud OCR fallback.
- Voice/model unavailable: route to fallback voice provider.

## 4. Conversion Graph (A -> B)
1. User selects source and target formats.
2. UI displays chosen conversion path.
3. If lossy, warning includes affected media/text features.
4. User confirms and job executes step-by-step.
5. Output + conversion manifest downloaded.

Recovery states:
- Unsupported target: show nearest alternatives and why direct path is unavailable.

## 5. Long-Text Chunk Synthesis + Merge
1. System chunks input text by provider max chars and sentence boundaries.
2. Synthesis runs per chunk with retry policy.
3. Partial chunks are playable immediately.
4. Merge worker stitches final output and publishes manifest.

Recovery states:
- Mid-stream failure: resume from failed chunk index, keep successful prior chunks.
