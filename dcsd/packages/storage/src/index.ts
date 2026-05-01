import { createHash, createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export interface SignedUrlRequest {
  baseUrl: string;
  bucket: string;
  objectKey: string;
  method: "PUT" | "GET";
  expiresSeconds: number;
  secret: string;
  extraQuery?: Record<string, string | number>;
  headers?: Record<string, string>;
}

export interface SignedUrlResponse {
  url: string;
  expiresAt: string;
  headers: Record<string, string>;
}

export function issueSignedUrl(req: SignedUrlRequest): SignedUrlResponse {
  const expiresAtMs = Date.now() + req.expiresSeconds * 1_000;
  const expiresAt = new Date(expiresAtMs).toISOString();
  const path = `/${req.bucket}/${req.objectKey}`;
  const signatureInput = `${req.method}|${path}|${expiresAtMs}`;
  const signature = createHmac("sha256", req.secret).update(signatureInput).digest("hex");

  const url = new URL(path, req.baseUrl);
  url.searchParams.set("expires", String(expiresAtMs));
  url.searchParams.set("sig", signature);
  url.searchParams.set("method", req.method);

  for (const [k, v] of Object.entries(req.extraQuery ?? {})) {
    url.searchParams.set(k, String(v));
  }

  return {
    url: url.toString(),
    expiresAt,
    headers: req.headers ?? {}
  };
}

export interface FileDetectionResult {
  extension: string;
  mimeType: string;
  family: "document" | "image" | "audio" | "video" | "unknown";
  likelyNeedsOcr: boolean;
}

const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  md: "text/markdown",
  html: "text/html",
  rtf: "application/rtf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  tiff: "image/tiff",
  tif: "image/tiff",
  bmp: "image/bmp",
  heif: "image/heif",
  wav: "audio/wav",
  mp3: "audio/mpeg",
  aac: "audio/aac",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  flac: "audio/flac",
  mp4: "video/mp4",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  webm: "video/webm"
};

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "tiff", "tif", "bmp", "heif"]);
const AUDIO_EXTENSIONS = new Set(["wav", "mp3", "aac", "m4a", "ogg", "flac"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "mkv", "avi", "webm"]);
const DOCUMENT_EXTENSIONS = new Set(["pdf", "docx", "txt", "md", "html", "rtf", "pptx", "xlsx"]);

export function detectFileType(filename: string, declaredMimeType: string): FileDetectionResult {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = EXTENSION_TO_MIME[extension] ?? declaredMimeType ?? "application/octet-stream";

  if (IMAGE_EXTENSIONS.has(extension)) {
    return { extension, mimeType, family: "image", likelyNeedsOcr: true };
  }

  if (AUDIO_EXTENSIONS.has(extension)) {
    return { extension, mimeType, family: "audio", likelyNeedsOcr: false };
  }

  if (VIDEO_EXTENSIONS.has(extension)) {
    return { extension, mimeType, family: "video", likelyNeedsOcr: false };
  }

  if (DOCUMENT_EXTENSIONS.has(extension)) {
    const likelyNeedsOcr = extension === "pdf";
    return { extension, mimeType, family: "document", likelyNeedsOcr };
  }

  return { extension, mimeType, family: "unknown", likelyNeedsOcr: false };
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function issueSupabaseSignedUploadUrl(input: {
  supabaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
  objectKey: string;
  expiresSeconds?: number;
}): Promise<SignedUrlResponse> {
  const supabase = createClient(input.supabaseUrl, input.serviceRoleKey, {
    auth: { persistSession: false }
  });
  const expiresIn = input.expiresSeconds ?? 15 * 60;

  const { data, error } = await supabase.storage
    .from(input.bucket)
    .createSignedUploadUrl(input.objectKey);

  if (error || !data) {
    throw new Error(`SUPABASE_SIGNED_URL_FAILED:${error?.message ?? "unknown"}`);
  }

  const url = `${input.supabaseUrl}/storage/v1/upload/sign/${input.bucket}/${data.path}?token=${data.token}`;
  return {
    url,
    expiresAt: new Date(Date.now() + expiresIn * 1_000).toISOString(),
    headers: {}
  };
}
