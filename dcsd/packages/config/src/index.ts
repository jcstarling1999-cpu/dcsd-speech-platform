import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  ORCHESTRATOR_POLL_MS: z.coerce.number().int().min(200).default(1_000),
  ENV_STRICT_VALIDATION: z.coerce.boolean().default(false),
  QUEUE_DRIVER: z.enum(["memory", "upstash-rest", "bullmq-compatible"]).default("upstash-rest"),

  DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5432/speech"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  OBJECT_STORE_BASE_URL: z.string().url().default("https://object.local"),
  OBJECT_STORE_PUBLIC_URL: z.string().url().default("https://object.local"),
  OBJECT_STORE_BUCKET: z.string().default("speech-platform-dev"),
  SIGNED_URL_SECRET: z.string().min(16).default("dev-signed-url-secret-change-me"),

  JWT_ISSUER: z.string().default("speech-platform"),
  JWT_AUDIENCE: z.string().default("speech-platform-api"),
  JWT_SECRET: z.string().min(16).default("dev-jwt-secret-change-me"),

  PROVIDER_REGION_DEFAULT: z.string().default("eastus"),
  COST_ROUTING_MODE_DEFAULT: z.enum(["economy", "balanced", "premium", "pinned"]).default("balanced"),

  AZURE_AI_KEY: z.string().optional(),
  AZURE_AI_ENDPOINT: z.string().url().optional(),
  AZURE_AI_API_VERSION: z.string().optional(),
  AZURE_AI_DEPLOYMENT: z.string().optional(),
  AZURE_REGION: z.string().optional(),
  AZURE_SPEECH_KEY: z.string().optional(),
  AZURE_SPEECH_REGION: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_BEARER_TOKEN_BEDROCK: z.string().optional(),
  DEEPGRAM_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  AIMLAPI_KEY: z.string().optional(),
  AIMLAPI_MANAGEMENT_KEY: z.string().optional(),

  ENABLE_PROVIDER_AZURE: z.coerce.boolean().default(true),
  ENABLE_PROVIDER_GOOGLE: z.coerce.boolean().default(false),
  ENABLE_PROVIDER_OPENAI: z.coerce.boolean().default(false),
  ENABLE_PROVIDER_ANTHROPIC: z.coerce.boolean().default(false),
  ENABLE_PROVIDER_AWS: z.coerce.boolean().default(false),
  ENABLE_PROVIDER_DEEPGRAM: z.coerce.boolean().default(false),
  ENABLE_PROVIDER_ELEVENLABS: z.coerce.boolean().default(false),
  ENABLE_PROVIDER_AIMLAPI: z.coerce.boolean().default(false),
  ENABLE_AZURE: z.coerce.boolean().optional(),
  ENABLE_FALLBACK_PROVIDERS: z.coerce.boolean().optional(),
  ENABLE_DEEPGRAM: z.coerce.boolean().optional(),
  ENABLE_ELEVENLABS: z.coerce.boolean().optional(),
  AIML_API_KEY: z.string().optional(),

  SUPABASE_STORAGE_BUCKET_UPLOADS: z.string().default("uploads"),
  SUPABASE_STORAGE_BUCKET_OUTPUTS: z.string().default("outputs"),

  ENABLE_BACKGROUND_ORCHESTRATOR: z.coerce.boolean().default(true),
  ENABLE_WEBHOOK_DISPATCH: z.coerce.boolean().default(false)
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function loadEnv(input: NodeJS.ProcessEnv = process.env): AppEnv {
  const env = EnvSchema.parse(input);
  const resolved = resolveAliases(env);
  const strict = resolved.NODE_ENV === "production" || resolved.ENV_STRICT_VALIDATION;

  if (!strict) {
    return resolved;
  }

  const missing: string[] = [];

  requirePair(resolved.UPSTASH_REDIS_REST_URL, resolved.UPSTASH_REDIS_REST_TOKEN, "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", missing);
  requirePair(resolved.NEXT_PUBLIC_SUPABASE_URL, resolved.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", missing);
  requirePresent(resolved.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY", missing);
  requirePresent(resolved.SIGNED_URL_SECRET, "SIGNED_URL_SECRET", missing);
  requirePresent(resolved.JWT_SECRET, "JWT_SECRET", missing);

  if (resolved.ENABLE_PROVIDER_AZURE) {
    requirePresent(resolved.AZURE_AI_KEY, "AZURE_AI_KEY", missing);
    requirePresent(resolved.AZURE_AI_ENDPOINT, "AZURE_AI_ENDPOINT", missing);
    requirePresent(resolved.AZURE_REGION, "AZURE_REGION", missing);
  }

  if (resolved.ENABLE_PROVIDER_GOOGLE) {
    requirePresent(resolved.GOOGLE_API_KEY, "GOOGLE_API_KEY", missing);
  }

  if (resolved.ENABLE_PROVIDER_OPENAI) {
    requirePresent(resolved.OPENAI_API_KEY, "OPENAI_API_KEY", missing);
  }

  if (resolved.ENABLE_PROVIDER_ANTHROPIC) {
    requirePresent(resolved.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY", missing);
  }

  if (resolved.ENABLE_PROVIDER_AWS) {
    requirePresent(resolved.AWS_ACCESS_KEY_ID, "AWS_ACCESS_KEY_ID", missing);
    requirePresent(resolved.AWS_SECRET_ACCESS_KEY, "AWS_SECRET_ACCESS_KEY", missing);
    requirePresent(resolved.AWS_REGION, "AWS_REGION", missing);
  }

  if (resolved.ENABLE_PROVIDER_DEEPGRAM) {
    requirePresent(resolved.DEEPGRAM_API_KEY, "DEEPGRAM_API_KEY", missing);
  }

  if (resolved.ENABLE_PROVIDER_ELEVENLABS) {
    requirePresent(resolved.ELEVENLABS_API_KEY, "ELEVENLABS_API_KEY", missing);
  }

  if (resolved.ENABLE_PROVIDER_AIMLAPI) {
    requirePresent(resolved.AIMLAPI_KEY, "AIMLAPI_KEY", missing);
    requirePresent(resolved.AIMLAPI_MANAGEMENT_KEY, "AIMLAPI_MANAGEMENT_KEY", missing);
  }

  if (missing.length > 0) {
    throw new Error(`ENV_VALIDATION_FAILED: Missing required variables: ${missing.join(", ")}`);
  }

  return resolved;
}

function resolveAliases(env: AppEnv): AppEnv {
  const enableAzure = env.ENABLE_AZURE ?? env.ENABLE_PROVIDER_AZURE;
  const enableDeepgram = env.ENABLE_DEEPGRAM ?? env.ENABLE_PROVIDER_DEEPGRAM;
  const enableElevenlabs = env.ENABLE_ELEVENLABS ?? env.ENABLE_PROVIDER_ELEVENLABS;
  const aimlKey = env.AIMLAPI_KEY ?? env.AIML_API_KEY;

  let enableGoogle = env.ENABLE_PROVIDER_GOOGLE;
  let enableOpenAi = env.ENABLE_PROVIDER_OPENAI;
  let enableAnthropic = env.ENABLE_PROVIDER_ANTHROPIC;
  let enableAws = env.ENABLE_PROVIDER_AWS;
  let enableAiml = env.ENABLE_PROVIDER_AIMLAPI;

  if (env.ENABLE_FALLBACK_PROVIDERS === false) {
    enableGoogle = false;
    enableOpenAi = false;
    enableAnthropic = false;
    enableAws = false;
    enableAiml = false;
  }

  return {
    ...env,
    AIMLAPI_KEY: aimlKey,
    ENABLE_PROVIDER_AZURE: enableAzure,
    ENABLE_PROVIDER_DEEPGRAM: enableDeepgram,
    ENABLE_PROVIDER_ELEVENLABS: enableElevenlabs,
    ENABLE_PROVIDER_GOOGLE: enableGoogle,
    ENABLE_PROVIDER_OPENAI: enableOpenAi,
    ENABLE_PROVIDER_ANTHROPIC: enableAnthropic,
    ENABLE_PROVIDER_AWS: enableAws,
    ENABLE_PROVIDER_AIMLAPI: enableAiml
  };
}

function requirePresent(value: string | undefined, key: string, missing: string[]): void {
  if (!value || value.trim().length === 0) {
    missing.push(key);
  }
}

function requirePair(
  left: string | undefined,
  right: string | undefined,
  leftKey: string,
  rightKey: string,
  missing: string[]
): void {
  if (!left && !right) {
    missing.push(leftKey, rightKey);
    return;
  }

  if (!left) {
    missing.push(leftKey);
  }

  if (!right) {
    missing.push(rightKey);
  }
}
