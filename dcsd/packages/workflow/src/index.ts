import type { TJobStatus, TJobType, TRoutingMode } from "@platform/contracts/src/index.js";

const allowedTransitions: Record<TJobStatus, readonly TJobStatus[]> = {
  draft: ["queued", "canceled"],
  queued: ["planning", "failed", "canceled"],
  planning: ["running", "failed", "canceled"],
  running: ["awaiting_callback", "merging", "failed", "canceled", "partially_succeeded"],
  awaiting_callback: ["running", "failed", "canceled"],
  merging: ["succeeded", "partially_succeeded", "failed"],
  succeeded: [],
  partially_succeeded: [],
  failed: [],
  canceled: []
};

export function canTransition(from: TJobStatus, to: TJobStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function assertTransition(from: TJobStatus, to: TJobStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`INVALID_STATE_TRANSITION:${from}->${to}`);
  }
}

interface RoutePolicyInput {
  type: TJobType;
  mode: TRoutingMode;
  region?: string;
  providerPin?: string;
}

export function defaultRouteForJobType(input: RoutePolicyInput): string[] {
  if (input.providerPin) {
    return [input.providerPin];
  }

  const mode = input.mode;
  switch (input.type) {
    case "stt":
      if (mode === "economy") return ["stt.whisper.local", "stt.aws", "stt.azure", "stt.google"];
      if (mode === "premium") return ["stt.azure", "stt.google", "stt.aws", "stt.qwen.optional"];
      return ["stt.azure", "stt.google", "stt.aws", "stt.whisper.local"];
    case "tts":
      if (mode === "economy") return ["tts.aws", "tts.google", "tts.azure", "tts.speechify"];
      if (mode === "premium") return ["tts.azure", "tts.speechify", "tts.google", "tts.aws"];
      return ["tts.azure", "tts.google", "tts.aws", "tts.speechify"];
    case "ocr":
      if (mode === "economy") return ["ocr.local", "ocr.azure", "ocr.google"];
      if (mode === "premium") return ["ocr.azure", "ocr.google", "ocr.local"];
      return ["ocr.azure", "ocr.google", "ocr.local"];
    case "convert":
      return ["convert.ffmpeg", "convert.document"];
    case "pipeline":
      return ["extract", "route", "execute", "merge"];
    case "ingest":
      return ["ingest.validate", "ingest.normalize"];
  }
}

export function computeBackoff(baseMs: number, attempt: number, maxMs = 60_000, jitterMs = 250): number {
  const exponential = Math.min(maxMs, baseMs * 2 ** attempt);
  const jitter = Math.floor(Math.random() * (jitterMs + 1));
  return exponential + jitter;
}

export interface TextChunk {
  chunkIndex: number;
  startChar: number;
  endChar: number;
  text: string;
}

export function chunkTextForSynthesis(text: string, maxChars: number): TextChunk[] {
  if (text.length <= maxChars) {
    return [{ chunkIndex: 0, startChar: 0, endChar: text.length, text }];
  }

  const chunks: TextChunk[] = [];
  let cursor = 0;
  let chunkIndex = 0;

  while (cursor < text.length) {
    let end = Math.min(cursor + maxChars, text.length);

    if (end < text.length) {
      const softBoundary = text.lastIndexOf(" ", end);
      if (softBoundary > cursor + Math.floor(maxChars * 0.6)) {
        end = softBoundary;
      }
    }

    chunks.push({
      chunkIndex,
      startChar: cursor,
      endChar: end,
      text: text.slice(cursor, end).trim()
    });

    cursor = end;
    chunkIndex += 1;
  }

  return chunks;
}

export interface ConversionEdge {
  from: string;
  to: string;
  engine: "ffmpeg" | "document" | "image" | "pandoc";
  lossy: boolean;
}

const conversionEdges: ConversionEdge[] = [
  { from: "wav", to: "mp3", engine: "ffmpeg", lossy: true },
  { from: "mp3", to: "wav", engine: "ffmpeg", lossy: false },
  { from: "mp4", to: "wav", engine: "ffmpeg", lossy: false },
  { from: "mov", to: "mp4", engine: "ffmpeg", lossy: false },
  { from: "mkv", to: "mp4", engine: "ffmpeg", lossy: true },
  { from: "webm", to: "mp4", engine: "ffmpeg", lossy: true },
  { from: "pdf", to: "txt", engine: "document", lossy: true },
  { from: "docx", to: "pdf", engine: "document", lossy: false },
  { from: "docx", to: "txt", engine: "document", lossy: true },
  { from: "md", to: "html", engine: "pandoc", lossy: false },
  { from: "html", to: "md", engine: "pandoc", lossy: true },
  { from: "pptx", to: "pdf", engine: "document", lossy: true },
  { from: "xlsx", to: "csv", engine: "document", lossy: true },
  { from: "png", to: "jpg", engine: "image", lossy: true },
  { from: "jpg", to: "png", engine: "image", lossy: false },
  { from: "tiff", to: "png", engine: "image", lossy: false },
  { from: "heif", to: "jpg", engine: "image", lossy: true }
];

export interface ConversionPathResult {
  edges: ConversionEdge[];
  lossy: boolean;
  explanation: string;
  alternatives: string[];
}

export function findConversionPath(from: string, to: string): ConversionPathResult | null {
  if (from === to) {
    return {
      edges: [],
      lossy: false,
      explanation: "Source and target formats are identical.",
      alternatives: []
    };
  }

  const visited = new Set<string>([from]);
  const queue: Array<{ format: string; path: ConversionEdge[] }> = [{ format: from, path: [] }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    const outgoing = conversionEdges.filter((edge) => edge.from === current.format);
    for (const edge of outgoing) {
      const nextPath = [...current.path, edge];
      if (edge.to === to) {
        const lossy = nextPath.some((value) => value.lossy);
        return {
          edges: nextPath,
          lossy,
          explanation: lossy
            ? "This conversion path contains at least one lossy transform."
            : "This conversion path is lossless with current graph assumptions.",
          alternatives: suggestNearestFormats(from, to)
        };
      }

      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        queue.push({ format: edge.to, path: nextPath });
      }
    }
  }

  return null;
}

function suggestNearestFormats(from: string, to: string): string[] {
  const outgoing = conversionEdges.filter((edge) => edge.from === from).map((edge) => edge.to);
  if (outgoing.length > 0) {
    return outgoing.slice(0, 4);
  }

  const incoming = conversionEdges.filter((edge) => edge.to === to).map((edge) => edge.from);
  return incoming.slice(0, 4);
}

export function makeStepIdempotencyKey(jobId: string, stepType: string, attempt: number): string {
  return `step:${jobId}:${stepType}:attempt:${attempt}`;
}

export function makeProviderCallIdempotencyKey(jobId: string, provider: string, operation: string): string {
  return `provider-call:${jobId}:${provider}:${operation}`;
}
