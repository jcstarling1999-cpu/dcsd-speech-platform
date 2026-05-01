import { randomUUID } from "node:crypto";
import type { TProviderCapability } from "@platform/contracts/src/index.js";
import { loadEnv } from "@platform/config/src/index.js";

export type AdapterType = "stt" | "tts" | "ocr" | "convert";

export interface AdapterRequest {
  jobId: string;
  stepId: string;
  inputUri: string;
  inputFormat: string;
  outputFormat: string;
  locale: string;
  region: string;
  chars?: number;
  durationSeconds?: number;
  payloadBytes: number;
  options: Record<string, unknown>;
}

export interface AdapterExecutionSegment {
  sequence: number;
  startMs: number;
  endMs: number;
  confidence?: number;
  text?: string;
  audioUri?: string;
}

export interface AdapterResult {
  provider: string;
  outputUris: string[];
  metrics: {
    latencyMs: number;
    estimatedCostUsd: number;
  };
  segments: AdapterExecutionSegment[];
  raw: Record<string, unknown>;
}

export interface PreflightResult {
  allowed: boolean;
  reason?: string;
}

export interface ProviderAdapter {
  readonly id: string;
  readonly type: AdapterType;
  readonly capability: TProviderCapability;
  preflight(input: AdapterRequest): PreflightResult;
  execute(request: AdapterRequest): Promise<AdapterResult>;
}

class AdapterPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdapterPreflightError";
  }
}

abstract class BaseAdapter implements ProviderAdapter {
  abstract readonly id: string;
  abstract readonly type: AdapterType;
  abstract readonly capability: TProviderCapability;

  preflight(input: AdapterRequest): PreflightResult {
    if (input.payloadBytes > this.capability.maxPayloadBytes) {
      return { allowed: false, reason: `PAYLOAD_BYTES_EXCEED_MAX:${this.capability.maxPayloadBytes}` };
    }

    if (
      typeof this.capability.maxDurationSeconds === "number" &&
      typeof input.durationSeconds === "number" &&
      input.durationSeconds > this.capability.maxDurationSeconds
    ) {
      return { allowed: false, reason: `DURATION_EXCEED_MAX:${this.capability.maxDurationSeconds}` };
    }

    if (typeof this.capability.maxChars === "number" && typeof input.chars === "number" && input.chars > this.capability.maxChars) {
      return { allowed: false, reason: `CHARS_EXCEED_MAX:${this.capability.maxChars}` };
    }

    if (!this.capability.supportedInputFormats.includes(input.inputFormat)) {
      return { allowed: false, reason: `UNSUPPORTED_INPUT:${input.inputFormat}` };
    }

    if (!this.capability.supportedOutputFormats.includes(input.outputFormat)) {
      return { allowed: false, reason: `UNSUPPORTED_OUTPUT:${input.outputFormat}` };
    }

    if (this.capability.supportedLocales.length > 0 && !this.capability.supportedLocales.includes(input.locale)) {
      return { allowed: false, reason: `UNSUPPORTED_LOCALE:${input.locale}` };
    }

    return { allowed: true };
  }

  async execute(request: AdapterRequest): Promise<AdapterResult> {
    const preflight = this.preflight(request);
    if (!preflight.allowed) {
      throw new AdapterPreflightError(preflight.reason ?? "PRECHECK_FAILED");
    }

    const started = Date.now();
    await sleep(simulatedLatencyByHint(this.capability.latencyHint));

    return {
      provider: this.id,
      outputUris: [`${request.inputUri.replace(/\/[^/]+$/, "")}/${request.stepId}-${this.id}.${request.outputFormat}`],
      metrics: {
        latencyMs: Date.now() - started,
        estimatedCostUsd: estimateCost(this.capability, request)
      },
      segments: buildSegmentsForType(this.type),
      raw: {
        providerRequestId: randomUUID(),
        region: request.region,
        mode: this.capability.qualityHint
      }
    };
  }
}

function simulatedLatencyByHint(latency: TProviderCapability["latencyHint"]): number {
  switch (latency) {
    case "low":
      return 80;
    case "medium":
      return 180;
    case "high":
      return 320;
  }
}

function estimateCost(capability: TProviderCapability, request: AdapterRequest): number {
  const unitQuantity = request.chars ?? request.durationSeconds ?? request.payloadBytes / (1024 * 1024);
  return Number((capability.costHintUsdPerUnit * Math.max(1, unitQuantity)).toFixed(4));
}

function buildSegmentsForType(type: AdapterType): AdapterExecutionSegment[] {
  if (type === "stt") {
    return [
      { sequence: 1, startMs: 0, endMs: 1200, confidence: 0.91, text: "Segment one" },
      { sequence: 2, startMs: 1200, endMs: 2600, confidence: 0.88, text: "Segment two" }
    ];
  }

  if (type === "tts") {
    return [
      { sequence: 1, startMs: 0, endMs: 1500, audioUri: "audio://chunk-1" },
      { sequence: 2, startMs: 1500, endMs: 3400, audioUri: "audio://chunk-2" }
    ];
  }

  return [{ sequence: 1, startMs: 0, endMs: 1000 }];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function envProviderEnabled(providerId: string): boolean {
  const env = loadEnv();
  if (providerId.startsWith("stt.azure") || providerId.startsWith("tts.azure") || providerId.startsWith("ocr.azure")) {
    return env.ENABLE_PROVIDER_AZURE && Boolean(env.AZURE_AI_KEY && env.AZURE_AI_ENDPOINT);
  }
  if (providerId.startsWith("stt.google") || providerId.startsWith("tts.google") || providerId.startsWith("ocr.google")) {
    return env.ENABLE_PROVIDER_GOOGLE && Boolean(env.GOOGLE_API_KEY);
  }
  if (providerId.startsWith("stt.aws") || providerId.startsWith("tts.aws")) {
    return env.ENABLE_PROVIDER_AWS && Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY);
  }
  if (providerId.startsWith("tts.speechify")) {
    return env.ENABLE_PROVIDER_AIMLAPI && Boolean(env.AIMLAPI_KEY);
  }
  return true;
}

function azureEndpointBase(): string {
  const env = loadEnv();
  return env.AZURE_AI_ENDPOINT?.replace(/\/+$/, "") ?? "";
}

function azureSpeechKey(): string {
  const env = loadEnv();
  return env.AZURE_SPEECH_KEY ?? env.AZURE_AI_KEY ?? "";
}

function azureSpeechRegion(): string {
  const env = loadEnv();
  return env.AZURE_SPEECH_REGION ?? env.AZURE_REGION ?? env.PROVIDER_REGION_DEFAULT;
}

async function tryReadUrlText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`SOURCE_READ_FAILED:${res.status}`);
  }
  return await res.text();
}

class AzureSttAdapter extends BaseAdapter {
  readonly id = "stt.azure";
  readonly type = "stt" as const;
  readonly capability: TProviderCapability = {
    provider: this.id,
    adapterType: "stt",
    taskClasses: ["STT_REALTIME", "STT_BATCH"],
    supportedInputFormats: ["wav", "mp3", "m4a", "mp4", "flac"],
    supportedOutputFormats: ["json", "txt", "srt", "vtt"],
    supportedLocales: ["en-US", "es-ES", "fr-FR", "de-DE", "ja-JP", "pt-BR"],
    maxPayloadBytes: 1_000_000_000,
    maxDurationSeconds: 18_000,
    qualityHint: "premium",
    latencyHint: "low",
    costHintUsdPerUnit: 0.016,
    retryProfile: { maxAttempts: 5, baseBackoffMs: 1000, jitterMs: 250 },
    quotaClass: "account-specific",
    confidence: "confirmed",
    references: [
      "https://learn.microsoft.com/azure/ai-services/speech-service/",
      "https://azure.microsoft.com/pricing/details/cognitive-services/speech-services/"
    ]
  };

  override async execute(request: AdapterRequest): Promise<AdapterResult> {
    const preflight = this.preflight(request);
    if (!preflight.allowed) {
      throw new AdapterPreflightError(preflight.reason ?? "PRECHECK_FAILED");
    }

    const started = Date.now();
    const key = azureSpeechKey();
    const region = azureSpeechRegion();
    if (!key || !isHttpUrl(request.inputUri)) {
      const fallback = await super.execute(request);
      return {
        ...fallback,
        raw: { ...fallback.raw, mode: "simulated", reason: !key ? "MISSING_AZURE_KEY" : "NON_HTTP_INPUT" }
      };
    }

    const endpoint = `https://${region}.api.cognitive.microsoft.com/speechtotext/v3.2/transcriptions`;
    const createRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Ocp-Apim-Subscription-Key": key
      },
      body: JSON.stringify({
        displayName: `dcsd-${request.jobId}-${request.stepId}`,
        locale: request.locale,
        contentUrls: [request.inputUri],
        properties: {
          wordLevelTimestampsEnabled: true,
          displayFormWordLevelTimestampsEnabled: true,
          punctuationMode: "DictatedAndAutomatic"
        }
      })
    });

    if (!createRes.ok) {
      const text = await createRes.text();
      throw new Error(`AZURE_STT_CREATE_FAILED:${createRes.status}:${text.slice(0, 200)}`);
    }

    const location = createRes.headers.get("location");
    if (!location) {
      throw new Error("AZURE_STT_NO_LOCATION");
    }

    let status = "Running";
    let pollCount = 0;
    let filesUrl = "";
    while (status !== "Succeeded" && status !== "Failed" && pollCount < 4) {
      pollCount += 1;
      await sleep(1200);
      const poll = await fetch(location, { headers: { "Ocp-Apim-Subscription-Key": key } });
      if (!poll.ok) {
        throw new Error(`AZURE_STT_POLL_FAILED:${poll.status}`);
      }
      const body = await poll.json();
      status = body.status ?? "Running";
      filesUrl = body.links?.files ?? filesUrl;
    }

    if (status === "Failed") {
      throw new Error("AZURE_STT_JOB_FAILED");
    }

    let transcriptUrl = filesUrl;
    if (filesUrl) {
      const filesRes = await fetch(filesUrl, { headers: { "Ocp-Apim-Subscription-Key": key } });
      if (filesRes.ok) {
        const files = await filesRes.json();
        const file = (files.values ?? []).find((x: any) => x.kind === "Transcription");
        transcriptUrl = file?.links?.contentUrl ?? transcriptUrl;
      }
    }

    const segments: AdapterExecutionSegment[] = [];
    if (transcriptUrl && isHttpUrl(transcriptUrl)) {
      try {
        const content = await fetch(transcriptUrl).then((r) => r.json());
        const combined = content.combinedRecognizedPhrases ?? [];
        for (let i = 0; i < combined.length; i += 1) {
          const phrase = combined[i];
          segments.push({
            sequence: i + 1,
            startMs: Number(phrase.offsetInTicks ?? 0) / 10_000,
            endMs: Number(phrase.offsetInTicks ?? 0) / 10_000 + Number(phrase.durationInTicks ?? 0) / 10_000,
            confidence: phrase.nBest?.[0]?.confidence,
            text: phrase.display ?? phrase.lexical
          });
        }
      } catch {
        // no-op
      }
    }

    return {
      provider: this.id,
      outputUris: transcriptUrl ? [transcriptUrl] : [location],
      metrics: {
        latencyMs: Date.now() - started,
        estimatedCostUsd: estimateCost(this.capability, request)
      },
      segments: segments.length > 0 ? segments : buildSegmentsForType(this.type),
      raw: {
        mode: "azure-live",
        transcriptionUrl: location,
        status,
        filesUrl
      }
    };
  }
}

class GoogleSttAdapter extends BaseAdapter {
  readonly id = "stt.google";
  readonly type = "stt" as const;
  readonly capability: TProviderCapability = {
    provider: this.id,
    adapterType: "stt",
    taskClasses: ["STT_REALTIME", "STT_BATCH", "STT_SHORT"],
    supportedInputFormats: ["wav", "flac", "mp3", "ogg"],
    supportedOutputFormats: ["json", "txt", "vtt", "srt"],
    supportedLocales: ["en-US", "es-ES", "fr-FR", "de-DE", "ja-JP", "pt-BR"],
    maxPayloadBytes: 500_000_000,
    maxDurationSeconds: 14_400,
    qualityHint: "balanced",
    latencyHint: "low",
    costHintUsdPerUnit: 0.016,
    retryProfile: { maxAttempts: 4, baseBackoffMs: 1200, jitterMs: 300 },
    quotaClass: "high",
    confidence: "confirmed",
    references: [
      "https://docs.cloud.google.com/speech-to-text/docs/quotas",
      "https://cloud.google.com/speech-to-text/pricing"
    ]
  };
}

class AwsTranscribeAdapter extends BaseAdapter {
  readonly id = "stt.aws";
  readonly type = "stt" as const;
  readonly capability: TProviderCapability = {
    provider: this.id,
    adapterType: "stt",
    taskClasses: ["STT_REALTIME", "STT_BATCH"],
    supportedInputFormats: ["wav", "flac", "mp3", "mp4"],
    supportedOutputFormats: ["json", "txt", "srt", "vtt"],
    supportedLocales: ["en-US", "es-US", "fr-FR", "de-DE", "ja-JP", "pt-BR"],
    maxPayloadBytes: 2_000_000_000,
    maxDurationSeconds: 14_400,
    qualityHint: "balanced",
    latencyHint: "medium",
    costHintUsdPerUnit: 0.015,
    retryProfile: { maxAttempts: 5, baseBackoffMs: 1500, jitterMs: 500 },
    quotaClass: "account-specific",
    confidence: "confirmed",
    references: [
      "https://docs.aws.amazon.com/general/latest/gr/transcribe.html",
      "https://aws.amazon.com/transcribe/pricing/"
    ]
  };
}

class WhisperLocalAdapter extends BaseAdapter {
  readonly id = "stt.whisper.local";
  readonly type = "stt" as const;
  readonly capability: TProviderCapability = {
    provider: this.id,
    adapterType: "stt",
    taskClasses: ["STT_BATCH", "STT_SHORT"],
    supportedInputFormats: ["wav", "mp3", "m4a", "flac"],
    supportedOutputFormats: ["json", "txt", "srt", "vtt"],
    supportedLocales: [],
    maxPayloadBytes: 2_000_000_000,
    maxDurationSeconds: 28_800,
    qualityHint: "balanced",
    latencyHint: "high",
    costHintUsdPerUnit: 0.003,
    retryProfile: { maxAttempts: 2, baseBackoffMs: 2000, jitterMs: 500 },
    quotaClass: "high",
    confidence: "assumption",
    references: []
  };
}

class QwenAudioAdapter extends BaseAdapter {
  readonly id = "stt.qwen.optional";
  readonly type = "stt" as const;
  readonly capability: TProviderCapability = {
    provider: this.id,
    adapterType: "stt",
    taskClasses: ["STT_BATCH"],
    supportedInputFormats: ["wav", "mp3", "flac"],
    supportedOutputFormats: ["json", "txt"],
    supportedLocales: [],
    maxPayloadBytes: 300_000_000,
    maxDurationSeconds: 7200,
    qualityHint: "premium",
    latencyHint: "medium",
    costHintUsdPerUnit: 0.012,
    retryProfile: { maxAttempts: 3, baseBackoffMs: 1200, jitterMs: 300 },
    quotaClass: "account-specific",
    confidence: "assumption",
    references: []
  };
}

class AzureTtsAdapter extends BaseAdapter {
  readonly id = "tts.azure";
  readonly type = "tts" as const;
  readonly capability: TProviderCapability = {
    provider: this.id,
    adapterType: "tts",
    taskClasses: ["TTS_REALTIME", "TTS_BATCH"],
    supportedInputFormats: ["txt", "ssml"],
    supportedOutputFormats: ["mp3", "wav", "ogg"],
    supportedLocales: ["en-US", "es-ES", "fr-FR", "de-DE", "ja-JP", "pt-BR"],
    maxPayloadBytes: 256_000,
    maxChars: 100_000,
    qualityHint: "premium",
    latencyHint: "low",
    costHintUsdPerUnit: 0.000016,
    retryProfile: { maxAttempts: 4, baseBackoffMs: 1000, jitterMs: 250 },
    quotaClass: "account-specific",
    confidence: "confirmed",
    references: [
      "https://learn.microsoft.com/azure/ai-services/speech-service/text-to-speech",
      "https://azure.microsoft.com/pricing/details/cognitive-services/speech-services/"
    ]
  };

  override async execute(request: AdapterRequest): Promise<AdapterResult> {
    const preflight = this.preflight(request);
    if (!preflight.allowed) {
      throw new AdapterPreflightError(preflight.reason ?? "PRECHECK_FAILED");
    }
    const started = Date.now();
    const key = azureSpeechKey();
    const region = azureSpeechRegion();
    const text = typeof request.options.sourceText === "string" ? request.options.sourceText : undefined;
    if (!key || !text) {
      const fallback = await super.execute(request);
      return {
        ...fallback,
        raw: { ...fallback.raw, mode: "simulated", reason: !key ? "MISSING_AZURE_KEY" : "MISSING_SOURCE_TEXT" }
      };
    }

    const voice = (request.options.voiceName as string | undefined) ?? "en-US-JennyNeural";
    const outputFormat = "audio-24khz-48kbitrate-mono-mp3";
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": outputFormat,
        "User-Agent": "dcsd-speech-platform"
      },
      body: `<speak version='1.0' xml:lang='${request.locale}'><voice name='${voice}'>${escapeXml(text)}</voice></speak>`
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AZURE_TTS_FAILED:${res.status}:${body.slice(0, 200)}`);
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    const dataUri = `data:audio/mpeg;base64,${bytes.toString("base64")}`;
    return {
      provider: this.id,
      outputUris: [dataUri],
      metrics: {
        latencyMs: Date.now() - started,
        estimatedCostUsd: estimateCost(this.capability, request)
      },
      segments: [
        { sequence: 1, startMs: 0, endMs: Math.max(2000, Math.round(text.length * 35)), audioUri: dataUri }
      ],
      raw: {
        mode: "azure-live",
        voice,
        audioBytes: bytes.length
      }
    };
  }
}

class GoogleTtsAdapter extends BaseAdapter {
  readonly id = "tts.google";
  readonly type = "tts" as const;
  readonly capability: TProviderCapability = {
    provider: this.id,
    adapterType: "tts",
    taskClasses: ["TTS_REALTIME", "TTS_BATCH"],
    supportedInputFormats: ["txt", "ssml"],
    supportedOutputFormats: ["mp3", "wav", "ogg"],
    supportedLocales: ["en-US", "es-ES", "fr-FR", "de-DE", "ja-JP", "pt-BR"],
    maxPayloadBytes: 256_000,
    maxChars: 5_000,
    qualityHint: "balanced",
    latencyHint: "low",
    costHintUsdPerUnit: 0.000004,
    retryProfile: { maxAttempts: 4, baseBackoffMs: 1200, jitterMs: 300 },
    quotaClass: "high",
    confidence: "confirmed",
    references: [
      "https://cloud.google.com/text-to-speech/pricing",
      "https://cloud.google.com/text-to-speech/docs"
    ]
  };
}

class AwsPollyAdapter extends BaseAdapter {
  readonly id = "tts.aws";
  readonly type = "tts" as const;
  readonly capability: TProviderCapability = {
    provider: this.id,
    adapterType: "tts",
    taskClasses: ["TTS_REALTIME", "TTS_BATCH"],
    supportedInputFormats: ["txt", "ssml"],
    supportedOutputFormats: ["mp3", "wav", "ogg"],
    supportedLocales: ["en-US", "es-US", "fr-FR", "de-DE", "ja-JP", "pt-BR"],
    maxPayloadBytes: 200_000,
    maxChars: 3_000,
    qualityHint: "balanced",
    latencyHint: "medium",
    costHintUsdPerUnit: 0.000004,
    retryProfile: { maxAttempts: 4, baseBackoffMs: 1500, jitterMs: 500 },
    quotaClass: "account-specific",
    confidence: "confirmed",
    references: [
      "https://aws.amazon.com/polly/pricing/",
      "https://docs.aws.amazon.com/polly/latest/dg/what-is.html"
    ]
  };
}

class SpeechifyTtsAdapter extends BaseAdapter {
  readonly id = "tts.speechify";
  readonly type = "tts" as const;
  readonly capability: TProviderCapability = {
    provider: this.id,
    adapterType: "tts",
    taskClasses: ["TTS_REALTIME", "TTS_BATCH"],
    supportedInputFormats: ["txt", "ssml"],
    supportedOutputFormats: ["mp3", "ogg", "aac", "wav", "pcm"],
    supportedLocales: [],
    maxPayloadBytes: 300_000,
    maxChars: 20_000,
    qualityHint: "premium",
    latencyHint: "low",
    costHintUsdPerUnit: 0.00001,
    retryProfile: { maxAttempts: 3, baseBackoffMs: 2000, jitterMs: 500 },
    quotaClass: "account-specific",
    confidence: "confirmed",
    references: [
      "https://speechify.com/pricing-api/"
    ]
  };
}

class AppleNativeTtsAdapter extends BaseAdapter {
  readonly id = "tts.apple.native";
  readonly type = "tts" as const;
  readonly capability: TProviderCapability = {
    provider: this.id,
    adapterType: "tts",
    taskClasses: ["NATIVE_ON_DEVICE"],
    supportedInputFormats: ["txt"],
    supportedOutputFormats: ["playback"],
    supportedLocales: ["en-US", "es-ES", "fr-FR", "de-DE", "ja-JP"],
    maxPayloadBytes: 128_000,
    maxChars: 5000,
    qualityHint: "balanced",
    latencyHint: "low",
    costHintUsdPerUnit: 0,
    retryProfile: { maxAttempts: 1, baseBackoffMs: 0, jitterMs: 0 },
    quotaClass: "high",
    confidence: "confirmed",
    references: [
      "https://developer.apple.com/documentation/avfaudio/avspeechsynthesizer"
    ]
  };
}

class LocalOcrAdapter extends BaseAdapter {
  readonly id = "ocr.local";
  readonly type = "ocr" as const;
  readonly capability: TProviderCapability = {
    provider: this.id,
    adapterType: "ocr",
    taskClasses: ["OCR_IMAGE", "OCR_DOC"],
    supportedInputFormats: ["jpg", "png", "tiff", "bmp", "pdf", "heif"],
    supportedOutputFormats: ["txt", "json", "pdf"],
    supportedLocales: [],
    maxPayloadBytes: 200_000_000,
    qualityHint: "economy",
    latencyHint: "high",
    costHintUsdPerUnit: 0.001,
    retryProfile: { maxAttempts: 2, baseBackoffMs: 2000, jitterMs: 500 },
    quotaClass: "high",
    confidence: "confirmed",
    references: [
      "https://tesseract-ocr.github.io/tessdoc/InputFormats.html",
      "https://ocrmypdf.readthedocs.io/en/v10.2.0/"
    ]
  };
}

class AzureOcrAdapter extends BaseAdapter {
  readonly id = "ocr.azure";
  readonly type = "ocr" as const;
  readonly capability: TProviderCapability = {
    provider: this.id,
    adapterType: "ocr",
    taskClasses: ["OCR_IMAGE", "OCR_DOC"],
    supportedInputFormats: ["jpg", "png", "tiff", "bmp", "pdf", "heif", "docx"],
    supportedOutputFormats: ["txt", "json"],
    supportedLocales: [],
    maxPayloadBytes: 500_000_000,
    qualityHint: "premium",
    latencyHint: "medium",
    costHintUsdPerUnit: 0.008,
    retryProfile: { maxAttempts: 5, baseBackoffMs: 1000, jitterMs: 250 },
    quotaClass: "account-specific",
    confidence: "assumption",
    references: [
      "https://learn.microsoft.com/azure/ai-services/document-intelligence/"
    ]
  };

  override async execute(request: AdapterRequest): Promise<AdapterResult> {
    const preflight = this.preflight(request);
    if (!preflight.allowed) {
      throw new AdapterPreflightError(preflight.reason ?? "PRECHECK_FAILED");
    }

    const started = Date.now();
    const key = azureSpeechKey();
    const endpointBase = azureEndpointBase();
    if (!key || !endpointBase || !isHttpUrl(request.inputUri)) {
      const fallback = await super.execute(request);
      return {
        ...fallback,
        raw: {
          ...fallback.raw,
          mode: "simulated",
          reason: !key || !endpointBase ? "MISSING_AZURE_CONFIG" : "NON_HTTP_INPUT"
        }
      };
    }

    // Primary: Document Intelligence prebuilt-read.
    const docUrl = `${endpointBase}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-11-30`;
    const submit = await fetch(docUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": key
      },
      body: JSON.stringify({ urlSource: request.inputUri })
    });

    let extractedText = "";
    let source = "document-intelligence";
    if (submit.ok) {
      const operation = submit.headers.get("operation-location");
      if (operation) {
        let status = "running";
        for (let i = 0; i < 5 && status === "running"; i += 1) {
          await sleep(1000);
          const poll = await fetch(operation, { headers: { "Ocp-Apim-Subscription-Key": key } });
          if (!poll.ok) {
            break;
          }
          const body = await poll.json();
          status = (body.status ?? "").toLowerCase();
          if (status === "succeeded") {
            const lines = body.analyzeResult?.content;
            extractedText = typeof lines === "string" ? lines : "";
          }
        }
      }
    }

    if (!extractedText) {
      // Fallback: Azure Vision Read endpoint.
      source = "vision-read";
      const region = azureSpeechRegion();
      const visionSubmit = await fetch(`https://${region}.api.cognitive.microsoft.com/vision/v3.2/read/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": key
        },
        body: JSON.stringify({ url: request.inputUri })
      });
      if (!visionSubmit.ok) {
        const body = await visionSubmit.text();
        throw new Error(`AZURE_OCR_FAILED:${visionSubmit.status}:${body.slice(0, 200)}`);
      }
      const op = visionSubmit.headers.get("operation-location");
      if (!op) {
        throw new Error("AZURE_OCR_NO_OPERATION");
      }
      for (let i = 0; i < 5; i += 1) {
        await sleep(1000);
        const poll = await fetch(op, { headers: { "Ocp-Apim-Subscription-Key": key } });
        if (!poll.ok) {
          break;
        }
        const body = await poll.json();
        if (body.status === "succeeded") {
          const lines = body.analyzeResult?.readResults?.flatMap((r: any) => r.lines?.map((l: any) => l.text) ?? []) ?? [];
          extractedText = lines.join("\n");
          break;
        }
      }
    }

    if (!extractedText) {
      throw new Error("AZURE_OCR_EMPTY_RESULT");
    }

    return {
      provider: this.id,
      outputUris: [`data:text/plain;base64,${Buffer.from(extractedText).toString("base64")}`],
      metrics: {
        latencyMs: Date.now() - started,
        estimatedCostUsd: estimateCost(this.capability, request)
      },
      segments: [{ sequence: 1, startMs: 0, endMs: 1000, text: extractedText.slice(0, 1200) }],
      raw: {
        mode: "azure-live",
        source
      }
    };
  }
}

class GoogleOcrAdapter extends BaseAdapter {
  readonly id = "ocr.google";
  readonly type = "ocr" as const;
  readonly capability: TProviderCapability = {
    provider: this.id,
    adapterType: "ocr",
    taskClasses: ["OCR_IMAGE", "OCR_DOC"],
    supportedInputFormats: ["jpg", "png", "tiff", "bmp", "pdf"],
    supportedOutputFormats: ["txt", "json"],
    supportedLocales: [],
    maxPayloadBytes: 1_000_000_000,
    qualityHint: "premium",
    latencyHint: "medium",
    costHintUsdPerUnit: 0.006,
    retryProfile: { maxAttempts: 4, baseBackoffMs: 1200, jitterMs: 300 },
    quotaClass: "account-specific",
    confidence: "confirmed",
    references: [
      "https://docs.cloud.google.com/document-ai/limits",
      "https://docs.cloud.google.com/vision/quotas"
    ]
  };
}

class FfmpegConverterAdapter extends BaseAdapter {
  readonly id = "convert.ffmpeg";
  readonly type = "convert" as const;
  readonly capability: TProviderCapability = {
    provider: this.id,
    adapterType: "convert",
    taskClasses: ["CONVERT_FILE"],
    supportedInputFormats: ["wav", "mp3", "aac", "m4a", "ogg", "flac", "mp4", "mov", "mkv", "avi", "webm"],
    supportedOutputFormats: ["wav", "mp3", "aac", "m4a", "ogg", "flac", "mp4", "mov", "mkv", "avi", "webm"],
    supportedLocales: [],
    maxPayloadBytes: 20_000_000_000,
    qualityHint: "balanced",
    latencyHint: "medium",
    costHintUsdPerUnit: 0.002,
    retryProfile: { maxAttempts: 3, baseBackoffMs: 1500, jitterMs: 300 },
    quotaClass: "high",
    confidence: "confirmed",
    references: [
      "https://www.ffmpeg.org/documentation.html"
    ]
  };
}

class DocumentConverterAdapter extends BaseAdapter {
  readonly id = "convert.document";
  readonly type = "convert" as const;
  readonly capability: TProviderCapability = {
    provider: this.id,
    adapterType: "convert",
    taskClasses: ["CONVERT_FILE"],
    supportedInputFormats: ["pdf", "docx", "txt", "md", "html", "rtf", "pptx", "xlsx", "jpg", "png", "tiff", "bmp", "heif"],
    supportedOutputFormats: ["pdf", "docx", "txt", "md", "html", "rtf", "jpg", "png", "csv"],
    supportedLocales: [],
    maxPayloadBytes: 2_000_000_000,
    qualityHint: "balanced",
    latencyHint: "high",
    costHintUsdPerUnit: 0.003,
    retryProfile: { maxAttempts: 3, baseBackoffMs: 2000, jitterMs: 500 },
    quotaClass: "high",
    confidence: "confirmed",
    references: [
      "https://help.libreoffice.org/latest/bs/text/shared/guide/start_parameters.html"
    ]
  };
}

export const adapters: ProviderAdapter[] = [
  new AzureSttAdapter(),
  new GoogleSttAdapter(),
  new AwsTranscribeAdapter(),
  new WhisperLocalAdapter(),
  new QwenAudioAdapter(),
  new AzureTtsAdapter(),
  new GoogleTtsAdapter(),
  new AwsPollyAdapter(),
  new SpeechifyTtsAdapter(),
  new AppleNativeTtsAdapter(),
  new LocalOcrAdapter(),
  new AzureOcrAdapter(),
  new GoogleOcrAdapter(),
  new FfmpegConverterAdapter(),
  new DocumentConverterAdapter()
];

export function byType(type: AdapterType): ProviderAdapter[] {
  return adapters.filter((adapter) => adapter.type === type && envProviderEnabled(adapter.id));
}

export function byId(id: string): ProviderAdapter | undefined {
  return adapters.find((adapter) => adapter.id === id);
}

export async function executeWithFallback(route: string[], request: AdapterRequest): Promise<AdapterResult> {
  const errors: string[] = [];

  for (const providerId of route) {
    const adapter = byId(providerId);
    if (!adapter) {
      errors.push(`${providerId}:NOT_FOUND`);
      continue;
    }

    try {
      return await adapter.execute(request);
    } catch (error) {
      errors.push(`${providerId}:${(error as Error).message}`);
    }
  }

  throw new Error(`ALL_PROVIDERS_FAILED:${errors.join("|")}`);
}

function escapeXml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}
