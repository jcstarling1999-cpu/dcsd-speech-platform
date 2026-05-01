# 2) Capability / Provider Matrix

Date: 2026-04-15 (America/Los_Angeles)
Method: Official docs review + implementation constraints used by adapters.

## Confidence Legend
- Confirmed: Explicitly documented in official provider docs.
- Assumption: Requires account/region-tier validation at deploy time.

## Matrix
| Provider | Feature classes | Pricing model | Input/Output | Limit class | Latency profile | Quality profile | Confidence |
|---|---|---|---|---|---|---|---|
| Azure Speech | STT realtime/batch, TTS neural/SSML | Usage by audio/chars/voice tier | STT: wav/mp3/m4a/mp4/flac -> json/txt/srt/vtt; TTS: txt/ssml -> mp3/wav/ogg | Account/region quotas | Low-medium | Premium multilingual | Confirmed |
| Google Speech + TTS | STT v2 streaming/batch, TTS | Usage by audio/chars and model tier | STT: wav/flac/mp3/ogg -> json/txt/vtt; TTS: txt/ssml -> mp3/wav/ogg | Quota per project/location | Low-medium | Balanced-premium | Confirmed |
| AWS Transcribe + Polly | STT streaming/batch, TTS | Usage-based | STT: wav/flac/mp3/mp4 -> json/txt/srt/vtt; TTS: txt/ssml -> mp3/wav/ogg | Service quota by account/region | Medium | Balanced | Confirmed |
| Speechify API | Premium TTS API | Plan/contract + usage | txt/ssml -> mp3/ogg/aac/wav/pcm | Endpoint/account-specific | Low | Premium voice style | Confirmed (limits partly assumption) |
| Apple Speech + AVSpeechSynthesizer | On-device STT/TTS for Apple clients | No direct cloud usage pricing | mic/audio buffers -> transcript; text -> playback | Device/OS constrained | Low | Device-dependent | Confirmed |
| Azure Document Intelligence | OCR/doc extraction | Per page/transaction | image/pdf/doc -> text/json | API/model-specific quotas | Medium | Premium structured docs | Confirmed |
| Google Vision / Document AI | OCR image/doc extraction | Per image/page/processor | image/pdf -> text/json | Project quotas and processor limits | Medium | Premium structured docs | Confirmed |
| Local OCR (Tesseract/OCRmyPDF) | OCR fallback | Infra only | image/pdf -> txt/pdf | Host-bound | High | Economy-balanced | Confirmed |
| FFmpeg/LibreOffice/Pandoc/ImageMagick | Conversion engines | Infra only | media/docs/images A->B | Host-bound + tool safety policy | Medium-high | Depends on path/tool | Confirmed |

## Routing Policy (Azure-Primary)

### Default lanes
- STT realtime: Azure -> Google -> AWS
- STT batch: AWS -> Azure -> Google -> Whisper local
- TTS realtime/batch: Azure -> Google -> AWS -> Speechify
- OCR image/doc: Azure -> Google -> Local OCR
- Convert: self-hosted graph (`ffmpeg`, `document`, `image`, `pandoc`)

### Failover conditions
- Hard failover: sustained 5xx, 429 beyond retry budget, unsupported format/locale, quota exhaustion, policy mismatch.
- Soft failover: p95 latency breach, low-confidence post-validation, queue/provider backpressure.
- No auto-failover: provider pinning, regulated region lock, same-voice continuity requirements.

### Cost-aware modes
- economy: cheapest route meeting minimum quality threshold.
- balanced: default lane with cost guardrails.
- premium: highest quality route within budget ceiling.
- pinned: explicit tenant provider/model lock.

## Date-Stamped References
- Azure Speech docs: https://learn.microsoft.com/azure/ai-services/speech-service/
- Azure Speech pricing: https://azure.microsoft.com/pricing/details/cognitive-services/speech-services/
- Google Speech quotas: https://docs.cloud.google.com/speech-to-text/docs/quotas
- Google Speech pricing: https://cloud.google.com/speech-to-text/pricing
- Google TTS pricing: https://cloud.google.com/text-to-speech/pricing
- AWS Transcribe quotas: https://docs.aws.amazon.com/general/latest/gr/transcribe.html
- AWS Transcribe pricing: https://aws.amazon.com/transcribe/pricing/
- AWS Polly pricing: https://aws.amazon.com/polly/pricing/
- Apple Speech framework: https://developer.apple.com/documentation/speech
- AVSpeechSynthesizer: https://developer.apple.com/documentation/avfaudio/avspeechsynthesizer
- SwiftUI glassEffect: https://developer.apple.com/documentation/swiftui/view/glasseffect(_:in:)
- SwiftUI GlassEffectContainer: https://developer.apple.com/documentation/swiftui/glasseffectcontainer
- OCRmyPDF docs: https://ocrmypdf.readthedocs.io/en/latest/
- Tesseract docs: https://tesseract-ocr.github.io/tessdoc/
- FFmpeg docs: https://www.ffmpeg.org/documentation.html
- LibreOffice CLI params: https://help.libreoffice.org/latest/bs/text/shared/guide/start_parameters.html

## Assumptions Requiring Deployment-Time Validation
- Exact per-resource quota numbers and burst limits for each cloud account.
- Region-level feature parity for voices/locales and advanced OCR processors.
- Speechify contract-specific throughput and concurrency quotas.
