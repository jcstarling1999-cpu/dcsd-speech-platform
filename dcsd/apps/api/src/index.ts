import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import websocket from "@fastify/websocket";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  ApiKeyCreateRequest,
  ApiKeyRecord,
  JobSubmitResponse,
  SubmitJobRequest,
  UploadCompleteRequest,
  UploadCreateRequest,
  UploadPartRequest,
  WebhookEndpointRequest,
  type TEventEnvelope
} from "@platform/contracts/src/index.js";
import { byType } from "@platform/adapters/src/index.js";
import { assertPermission, can, generateApiKey, signJwt, verifyApiKey, verifyJwt, type Role } from "@platform/auth/src/index.js";
import { loadEnv } from "@platform/config/src/index.js";
import {
  attachUploadSignedUrls,
  completeUpload,
  createApiKey,
  createUploadSession,
  createWebhookEndpoint,
  findApiKeyByPrefix,
  getIdempotency,
  getJob,
  getUploadSession,
  listJobsByTenant,
  listApiKeys,
  listWebhookEndpoints,
  revokeApiKey,
  updateJobStatus,
  updateApiKeyLastUsed
} from "@platform/database/src/index.js";
import { log, snapshotMetrics } from "@platform/observability/src/index.js";
import { detectFileType, issueSignedUrl, issueSupabaseSignedUploadUrl } from "@platform/storage/src/index.js";
import { PlatformRuntime } from "./runtime.js";

interface Principal {
  tenantId: string;
  userId: string;
  role: Role;
  scopes: string[];
  method: "jwt" | "api-key" | "dev";
}

type LlmProviderName = "azure" | "openai" | "anthropic" | "aimlapi" | "bedrock";
type LlmRole = "system" | "user" | "assistant";

interface LlmCatalogItem {
  provider: LlmProviderName;
  enabled: boolean;
  configured: boolean;
  models: string[];
  defaultModel: string;
}

const DEFAULT_LLM_MODELS: Record<LlmProviderName, string[]> = {
  azure: ["gpt-4o-mini", "gpt-4o"],
  openai: ["gpt-4o-mini", "gpt-4o"],
  anthropic: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229"],
  aimlapi: ["gpt-4o", "gpt-4o-mini", "kimi-k2.6", "claude-3-5-sonnet-20241022"],
  bedrock: ["anthropic.claude-opus-4-7", "nvidia.nemotron-super-3-120b"]
};

const env = loadEnv();
const runtime = new PlatformRuntime({
  region: env.PROVIDER_REGION_DEFAULT,
  defaultRoutingMode: env.COST_ROUTING_MODE_DEFAULT,
  queueEnv: {
    QUEUE_DRIVER: env.QUEUE_DRIVER,
    UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN
  }
});

const wsSubscribers = new Map<string, Set<any>>();

const LlmChatRequest = z.object({
  provider: z.enum(["azure", "openai", "anthropic", "aimlapi", "bedrock"]).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(4096).optional(),
  system: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().min(1)
      })
    )
    .min(1)
});

export function buildServer() {
  const app = Fastify({ logger: false });

  app.addHook("onRequest", async (request, reply) => {
    const origin = request.headers.origin ?? "*";
    reply.header("access-control-allow-origin", origin);
    reply.header("access-control-allow-headers", "content-type,authorization,x-api-key,x-tenant-id,x-user-id,x-role");
    reply.header("access-control-allow-methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    if (request.method === "OPTIONS") {
      reply.code(204).send();
    }
  });
  app.register(websocket);

  runtime.subscribe((event) => broadcastEvent(event));

  app.setErrorHandler((error, _request, reply) => {
    if (error.message === "UNAUTHORIZED" || error.message === "INVALID_API_KEY" || error.message.startsWith("INVALID_JWT")) {
      reply.code(401).send({ code: "UNAUTHORIZED", message: "authentication required" });
      return;
    }

    if (error.message === "FORBIDDEN") {
      reply.code(403).send({ code: "FORBIDDEN", message: "insufficient permissions" });
      return;
    }

    reply.code(500).send({ code: "INTERNAL_ERROR", message: error.message });
  });

  app.addHook("onRequest", async (request, _reply) => {
    const openRoutes = ["/health", "/health/readiness", "/v1/providers/capabilities", "/v1/dev/token", "/v1/ws"];
    const path = request.url.split("?")[0] ?? request.url;
    if (openRoutes.includes(path)) {
      return;
    }

    const principal = await authenticateRequest(request);
    request.principal = principal;
  });

  app.get("/health", async () => ({ status: "ok", service: "api", metrics: snapshotMetrics() }));
  app.get("/health/readiness", async () => {
    const hasSupabase = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
    const hasUpstash = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
    const hasAzure = Boolean(env.AZURE_AI_KEY && env.AZURE_AI_ENDPOINT && env.AZURE_REGION);

    return {
      status: hasSupabase && hasUpstash && hasAzure ? "ready" : "degraded",
      checks: {
        envStrict: env.ENV_STRICT_VALIDATION || env.NODE_ENV === "production",
        supabase: hasSupabase ? "ok" : "missing-config",
        queue: hasUpstash ? env.QUEUE_DRIVER : "fallback-memory",
        storage: hasSupabase ? "ok" : "missing-config",
        azurePrimary: hasAzure ? "ok" : "missing-config",
        providers: {
          azure: env.ENABLE_PROVIDER_AZURE && hasAzure ? "enabled" : "disabled",
          google: env.ENABLE_PROVIDER_GOOGLE ? "enabled" : "disabled",
          aws: env.ENABLE_PROVIDER_AWS ? "enabled" : "disabled",
          deepgram: env.ENABLE_PROVIDER_DEEPGRAM ? "enabled" : "disabled",
          elevenlabs: env.ENABLE_PROVIDER_ELEVENLABS ? "enabled" : "disabled",
          aimlapi: env.ENABLE_PROVIDER_AIMLAPI ? "enabled" : "disabled"
        }
      },
      queueSnapshot: runtime.queue.snapshot()
    };
  });

  app.get("/v1/llm/models", async (request, reply) => {
    const principal = getPrincipal(request);
    assertPermission(principal.role, "settings:read");

    return reply.send({ providers: buildLlmModelCatalog(env) });
  });

  app.get("/v1/llm/health", async (request, reply) => {
    const principal = getPrincipal(request);
    assertPermission(principal.role, "settings:read");

    const { mode } = (request.query as { mode?: string }) ?? {};
    const catalog = buildLlmModelCatalog(env);

    if (mode !== "probe") {
      return reply.send({
        mode: "keys",
        providers: catalog.map((item) => ({
          provider: item.provider,
          status: item.enabled ? (item.configured ? "ok" : "unconfigured") : "disabled"
        }))
      });
    }

    const probes = await Promise.allSettled(
      catalog.map(async (item) => {
        if (!item.enabled || !item.configured) {
          return {
            provider: item.provider,
            status: item.enabled ? "unconfigured" : "disabled",
            latencyMs: 0
          };
        }

        const result = await probeLlmProvider(env, item.provider, item.defaultModel);
        return result;
      })
    );

    return reply.send({
      mode: "probe",
      providers: probes.map((result) =>
        result.status === "fulfilled"
          ? result.value
          : {
              provider: "unknown",
              status: "error",
              latencyMs: 0,
              error: "probe failed"
            }
      )
    });
  });

  app.post("/v1/llm/chat", async (request, reply) => {
    const principal = getPrincipal(request);
    assertPermission(principal.role, "jobs:write");

    const parsed = LlmChatRequest.safeParse(request.body);
    if (!parsed.success) {
      return validationError(reply, parsed.error.issues);
    }

    const catalog = buildLlmModelCatalog(env);
    const available = catalog.filter((item) => item.enabled && item.configured);
    if (available.length === 0) {
      return reply.code(503).send({ code: "NO_LLM_PROVIDERS", message: "no LLM providers are configured" });
    }

    const requestedProvider = parsed.data.provider;
    const fallbackProvider = available[0];
    const provider = requestedProvider ?? fallbackProvider?.provider;
    if (!provider) {
      return reply.code(503).send({ code: "NO_LLM_PROVIDERS", message: "no LLM providers are configured" });
    }
    const providerConfig = catalog.find((item) => item.provider === provider);
    if (!providerConfig || !providerConfig.enabled || !providerConfig.configured) {
      return reply.code(400).send({ code: "LLM_PROVIDER_UNAVAILABLE", message: "provider is not configured" });
    }

    const model = parsed.data.model ?? providerConfig.defaultModel;
    const messages = normalizeChatMessages(parsed.data.messages, parsed.data.system);

    try {
      const started = Date.now();
      const result = await callLlmProvider(env, provider, {
        model,
        messages,
        temperature: parsed.data.temperature ?? 0.4,
        maxTokens: parsed.data.maxTokens ?? 800
      });

      return reply.send({
        provider,
        model: result.model,
        latencyMs: Date.now() - started,
        message: { role: "assistant", content: result.content }
      });
    } catch (error) {
      log({
        level: "error",
        service: "api",
        message: "llm chat failed",
        fields: { provider, error: (error as Error).message }
      });
      return reply.code(502).send({ code: "LLM_ERROR", message: "provider request failed" });
    }
  });

  app.post("/v1/dev/token", async (request, reply) => {
    if (env.NODE_ENV === "production") {
      return reply.code(404).send({ code: "NOT_FOUND", message: "not available in production" });
    }

    const body = request.body as { tenantId?: string; userId?: string; role?: Role; scopes?: string[]; ttlSeconds?: number };
    const token = signJwt(
      {
        sub: body?.userId ?? randomUUID(),
        tenantId: body?.tenantId ?? randomUUID(),
        role: body?.role ?? "owner",
        scopes: body?.scopes ?? ["jobs:write", "jobs:read", "keys:write", "settings:write"],
        ttlSeconds: body?.ttlSeconds ?? 24 * 60 * 60,
        iss: env.JWT_ISSUER,
        aud: env.JWT_AUDIENCE
      },
      env.JWT_SECRET
    );

    return reply.send({ token });
  });

  app.get("/v1/providers/capabilities", async () => ({
    stt: byType("stt").map((x) => x.capability),
    tts: byType("tts").map((x) => x.capability),
    ocr: byType("ocr").map((x) => x.capability),
    convert: byType("convert").map((x) => x.capability)
  }));

  app.post("/v1/uploads", async (request, reply) => {
    const principal = getPrincipal(request);
    if (!can(principal.role, "jobs:write")) {
      return forbidden(reply);
    }

    const parsed = UploadCreateRequest.safeParse(request.body);
    if (!parsed.success) {
      return validationError(reply, parsed.error.issues);
    }

    if (parsed.data.tenantId !== principal.tenantId) {
      return reply.code(403).send({ code: "TENANT_MISMATCH", message: "tenant mismatch" });
    }

    const expectedParts = Math.ceil(parsed.data.sizeBytes / parsed.data.chunkSizeBytes);
    const storageKey = `raw/${parsed.data.tenantId}/${Date.now()}-${parsed.data.filename.replace(/\s+/g, "-")}`;

    const upload = createUploadSession({
      tenantId: parsed.data.tenantId,
      userId: parsed.data.userId,
      filename: parsed.data.filename,
      contentType: parsed.data.contentType,
      sizeBytes: parsed.data.sizeBytes,
      checksumSha256: parsed.data.checksumSha256,
      chunkSizeBytes: parsed.data.chunkSizeBytes,
      expectedParts,
      storageKey
    });

    const firstParts = Array.from({ length: Math.min(3, expectedParts) }).map((_, idx) => idx + 1);
    const signed = await Promise.all(
      firstParts.map((partNumber) => signUploadPartUrl(env, upload.uploadId, storageKey, parsed.data.contentType, partNumber))
    );

    const detected = detectFileType(parsed.data.filename, parsed.data.contentType);
    const updated = attachUploadSignedUrls(upload.uploadId, signed);

    return reply.code(201).send({
      upload: updated,
      detected,
      next: {
        signPart: `/v1/uploads/${upload.uploadId}/parts`,
        complete: `/v1/uploads/${upload.uploadId}/complete`
      }
    });
  });

  app.post("/v1/uploads/:uploadId/parts", async (request, reply) => {
    const principal = getPrincipal(request);
    const parsed = UploadPartRequest.safeParse(request.body);
    if (!parsed.success) {
      return validationError(reply, parsed.error.issues);
    }

    const upload = getUploadSession((request.params as { uploadId: string }).uploadId);
    if (!upload) {
      return reply.code(404).send({ code: "UPLOAD_NOT_FOUND", message: "upload session not found" });
    }

    if (upload.tenantId !== principal.tenantId) {
      return forbidden(reply);
    }

    const signedUrl = await signUploadPartUrl(env, upload.uploadId, upload.storageKey, upload.contentType, parsed.data.partNumber);

    return reply.send({ uploadId: upload.uploadId, partNumber: parsed.data.partNumber, signedUrl });
  });

  app.post("/v1/uploads/:uploadId/complete", async (request, reply) => {
    const principal = getPrincipal(request);
    const parsed = UploadCompleteRequest.safeParse(request.body);
    if (!parsed.success) {
      return validationError(reply, parsed.error.issues);
    }

    const upload = getUploadSession((request.params as { uploadId: string }).uploadId);
    if (!upload) {
      return reply.code(404).send({ code: "UPLOAD_NOT_FOUND", message: "upload session not found" });
    }

    if (upload.tenantId !== principal.tenantId) {
      return forbidden(reply);
    }

    const completed = completeUpload(upload.uploadId, parsed.data.parts);
    return reply.send(completed);
  });

  app.post("/v1/jobs", async (request, reply) => {
    const principal = getPrincipal(request);
    assertPermission(principal.role, "jobs:write");

    const parsed = SubmitJobRequest.safeParse(request.body);
    if (!parsed.success) {
      return validationError(reply, parsed.error.issues);
    }

    if (parsed.data.tenantId !== principal.tenantId || parsed.data.userId !== principal.userId) {
      return reply.code(403).send({ code: "TENANT_OR_USER_MISMATCH", message: "tenant or user mismatch" });
    }

    const existingIdem = getIdempotency("jobs.create", parsed.data.tenantId, parsed.data.idempotencyKey);
    if (existingIdem?.resourceId) {
      const existingJob = getJob(existingIdem.resourceId);
      if (existingJob) {
        return reply.code(202).send(JobSubmitResponse.parse({
          jobId: existingJob.jobId,
          status: existingJob.status,
          route: existingJob.route
        }));
      }
    }

    const job = await runtime.submitJob(parsed.data);

    return reply.code(202).send(JobSubmitResponse.parse({
      jobId: job.jobId,
      status: job.status,
      route: job.route
    }));
  });

  app.get("/v1/jobs", async (request, reply) => {
    const principal = getPrincipal(request);
    assertPermission(principal.role, "jobs:read");
    return reply.send({ items: listJobsByTenant(principal.tenantId) });
  });

  app.get("/v1/jobs/:jobId", async (request, reply) => {
    const principal = getPrincipal(request);
    assertPermission(principal.role, "jobs:read");

    const jobId = (request.params as { jobId: string }).jobId;
    const job = getJob(jobId);
    if (!job) {
      return reply.code(404).send({ code: "JOB_NOT_FOUND", message: "job not found" });
    }

    if (job.tenantId !== principal.tenantId) {
      return forbidden(reply);
    }

    return reply.send(runtime.getJobView(jobId));
  });

  app.post("/v1/jobs/:jobId/cancel", async (request, reply) => {
    const principal = getPrincipal(request);
    assertPermission(principal.role, "jobs:write");

    const job = getJob((request.params as { jobId: string }).jobId);
    if (!job) {
      return reply.code(404).send({ code: "JOB_NOT_FOUND", message: "job not found" });
    }

    if (job.tenantId !== principal.tenantId) {
      return forbidden(reply);
    }

    const canceled = updateJobStatus(job.jobId, "canceled", job.progress);
    return reply.send({ jobId: canceled.jobId, status: canceled.status });
  });

  app.post("/v1/jobs/:jobId/retry", async (request, reply) => {
    const principal = getPrincipal(request);
    assertPermission(principal.role, "jobs:write");

    const job = getJob((request.params as { jobId: string }).jobId);
    if (!job) {
      return reply.code(404).send({ code: "JOB_NOT_FOUND", message: "job not found" });
    }

    if (job.tenantId !== principal.tenantId) {
      return forbidden(reply);
    }

    const reset = updateJobStatus(job.jobId, "queued", 0);
    await runtime.queue.enqueue({
      queue: mapJobTypeToQueue(reset.type),
      dedupeKey: `${reset.tenantId}:retry:${reset.jobId}:${Date.now()}`,
      payload: {
        tenantId: reset.tenantId,
        userId: reset.userId,
        jobId: reset.jobId,
        type: reset.type,
        attempt: 0
      },
      maxAttempts: 5
    });

    return reply.code(202).send({ jobId: reset.jobId, status: reset.status });
  });

  app.post("/v1/webhooks", async (request, reply) => {
    const principal = getPrincipal(request);
    assertPermission(principal.role, "settings:write");

    const parsed = WebhookEndpointRequest.safeParse(request.body);
    if (!parsed.success) {
      return validationError(reply, parsed.error.issues);
    }

    if (parsed.data.tenantId !== principal.tenantId) {
      return forbidden(reply);
    }

    const secret = `whsec_${randomBytes(18).toString("base64url")}`;
    const endpoint = createWebhookEndpoint({
      tenantId: parsed.data.tenantId,
      url: parsed.data.url,
      events: parsed.data.events,
      secretPreview: `${secret.slice(0, 8)}...`,
      enabled: true
    });

    return reply.code(201).send({ ...endpoint, secret });
  });

  app.get("/v1/webhooks", async (request, reply) => {
    const principal = getPrincipal(request);
    assertPermission(principal.role, "settings:read");
    return reply.send({ items: listWebhookEndpoints(principal.tenantId) });
  });

  app.post("/v1/api-keys", async (request, reply) => {
    const principal = getPrincipal(request);
    assertPermission(principal.role, "keys:write");

    const parsed = ApiKeyCreateRequest.safeParse(request.body);
    if (!parsed.success) {
      return validationError(reply, parsed.error.issues);
    }

    if (parsed.data.tenantId !== principal.tenantId || parsed.data.userId !== principal.userId) {
      return forbidden(reply);
    }

    const generated = generateApiKey();
    const apiKey = createApiKey({
      tenantId: parsed.data.tenantId,
      userId: parsed.data.userId,
      label: parsed.data.label,
      scopes: parsed.data.scopes,
      keyPrefix: generated.keyPrefix,
      keyHash: generated.keyHash
    });

    return reply.code(201).send({ apiKey: ApiKeyRecord.parse(apiKey), token: generated.plainText });
  });

  app.get("/v1/api-keys", async (request, reply) => {
    const principal = getPrincipal(request);
    assertPermission(principal.role, "keys:read");

    return reply.send({ items: listApiKeys(principal.tenantId) });
  });

  app.post("/v1/api-keys/:apiKeyId/revoke", async (request, reply) => {
    const principal = getPrincipal(request);
    assertPermission(principal.role, "keys:write");
    try {
      const revoked = revokeApiKey((request.params as { apiKeyId: string }).apiKeyId, principal.tenantId);
      return reply.send({ apiKey: ApiKeyRecord.parse(revoked) });
    } catch (error) {
      if ((error as Error).message === "API_KEY_NOT_FOUND") {
        return reply.code(404).send({ code: "API_KEY_NOT_FOUND", message: "api key not found" });
      }
      throw error;
    }
  });

  app.get("/v1/ws", { websocket: true }, async (socket, request) => {
    const ws = "socket" in socket ? socket.socket : socket;
    if (!ws || typeof ws.send !== "function") {
      return;
    }

    try {
      const principal = await authenticateRequest(request);
      const group = wsSubscribers.get(principal.tenantId) ?? new Set<any>();
      group.add(ws);
      wsSubscribers.set(principal.tenantId, group);

      ws.send(
        JSON.stringify({
          type: "connected",
          timestamp: new Date().toISOString(),
          tenantId: principal.tenantId
        })
      );

      ws.on("close", () => {
        const existing = wsSubscribers.get(principal.tenantId);
        existing?.delete(ws);
      });
    } catch {
      ws.close?.();
    }
  });

  let intervalRef: NodeJS.Timeout | undefined;
  if (env.ENABLE_BACKGROUND_ORCHESTRATOR) {
    intervalRef = setInterval(async () => {
      try {
        await runtime.processQueueTick(5);
      } catch (error) {
        log({
          level: "error",
          service: "api",
          message: "background orchestrator tick failed",
          fields: { error: (error as Error).message }
        });
      }
    }, env.ORCHESTRATOR_POLL_MS);
  }

  app.addHook("onClose", async () => {
    if (intervalRef) {
      clearInterval(intervalRef);
    }
  });

  return app;
}

function buildLlmModelCatalog(env: ReturnType<typeof loadEnv>): LlmCatalogItem[] {
  const azureConfigured = Boolean(env.AZURE_AI_KEY && env.AZURE_AI_ENDPOINT);
  const openaiConfigured = Boolean(env.OPENAI_API_KEY);
  const anthropicConfigured = Boolean(env.ANTHROPIC_API_KEY);
  const aimlConfigured = Boolean(env.AIMLAPI_KEY);
  const bedrockConfigured = Boolean(env.AWS_BEARER_TOKEN_BEDROCK || (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY));
  const fallbackDisabled = env.ENABLE_FALLBACK_PROVIDERS === false;

  const azureEnabled = autoEnableProvider(azureConfigured, env.ENABLE_PROVIDER_AZURE, ["ENABLE_PROVIDER_AZURE", "ENABLE_AZURE"]);
  const openaiEnabled = autoEnableProvider(openaiConfigured, env.ENABLE_PROVIDER_OPENAI, ["ENABLE_PROVIDER_OPENAI"], fallbackDisabled);
  const anthropicEnabled = autoEnableProvider(anthropicConfigured, env.ENABLE_PROVIDER_ANTHROPIC, ["ENABLE_PROVIDER_ANTHROPIC"], fallbackDisabled);
  const aimlEnabled = autoEnableProvider(aimlConfigured, env.ENABLE_PROVIDER_AIMLAPI, ["ENABLE_PROVIDER_AIMLAPI"], fallbackDisabled);
  const bedrockEnabled = autoEnableProvider(bedrockConfigured, env.ENABLE_PROVIDER_AWS, ["ENABLE_PROVIDER_AWS"], fallbackDisabled);

  const azureModels = env.AZURE_AI_DEPLOYMENT ? [env.AZURE_AI_DEPLOYMENT, ...DEFAULT_LLM_MODELS.azure] : DEFAULT_LLM_MODELS.azure;

  return [
    {
      provider: "azure" as const,
      enabled: azureEnabled,
      configured: azureConfigured,
      models: azureModels,
      defaultModel: env.AZURE_AI_DEPLOYMENT ?? DEFAULT_LLM_MODELS.azure[0] ?? "gpt-4o-mini"
    },
    {
      provider: "openai" as const,
      enabled: openaiEnabled,
      configured: openaiConfigured,
      models: DEFAULT_LLM_MODELS.openai,
      defaultModel: DEFAULT_LLM_MODELS.openai[0] ?? "gpt-4o-mini"
    },
    {
      provider: "anthropic" as const,
      enabled: anthropicEnabled,
      configured: anthropicConfigured,
      models: DEFAULT_LLM_MODELS.anthropic,
      defaultModel: DEFAULT_LLM_MODELS.anthropic[0] ?? "claude-3-5-sonnet-20241022"
    },
    {
      provider: "aimlapi" as const,
      enabled: aimlEnabled,
      configured: aimlConfigured,
      models: DEFAULT_LLM_MODELS.aimlapi,
      defaultModel: DEFAULT_LLM_MODELS.aimlapi[0] ?? "gpt-4o"
    },
    {
      provider: "bedrock" as const,
      enabled: bedrockEnabled,
      configured: bedrockConfigured,
      models: DEFAULT_LLM_MODELS.bedrock,
      defaultModel: DEFAULT_LLM_MODELS.bedrock[0] ?? "anthropic.claude-opus-4-7"
    }
  ];
}

function autoEnableProvider(configured: boolean, enabled: boolean, toggleNames: string[], fallbackDisabled = false): boolean {
  if (enabled) {
    return true;
  }
  if (fallbackDisabled) {
    return false;
  }
  const explicitToggle = toggleNames.some((name) => Object.prototype.hasOwnProperty.call(process.env, name));
  if (explicitToggle) {
    return false;
  }
  return configured;
}

function normalizeChatMessages(messages: Array<{ role: LlmRole; content: string }>, system?: string) {
  const filtered = messages.filter((message) => message.role !== "system");
  if (system && system.trim().length > 0) {
    return [{ role: "system" as const, content: system.trim() }, ...filtered];
  }
  return messages;
}

async function probeLlmProvider(env: ReturnType<typeof loadEnv>, provider: LlmProviderName, model: string) {
  const started = Date.now();
  try {
    await callLlmProvider(env, provider, {
      model,
      messages: [{ role: "user", content: "Reply with just the word ok." }],
      temperature: 0,
      maxTokens: 16
    });
    return { provider, status: "ok", latencyMs: Date.now() - started };
  } catch (error) {
    return { provider, status: "error", latencyMs: Date.now() - started, error: (error as Error).message };
  }
}

async function callLlmProvider(
  env: ReturnType<typeof loadEnv>,
  provider: LlmProviderName,
  input: { model: string; messages: Array<{ role: LlmRole; content: string }>; temperature: number; maxTokens: number }
) {
  switch (provider) {
    case "azure":
      return callAzureChat(env, input);
    case "openai":
      return callOpenAiChat(env, input);
    case "anthropic":
      return callAnthropicChat(env, input);
    case "aimlapi":
      return callAimlChat(env, input);
    case "bedrock":
      return callBedrockChat(env, input);
  }
}

function buildPromptFromMessages(messages: Array<{ role: LlmRole; content: string }>): string {
  return messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");
}

async function callBedrockChat(
  env: ReturnType<typeof loadEnv>,
  input: { model: string; messages: Array<{ role: LlmRole; content: string }>; temperature: number; maxTokens: number }
) {
  const region = env.AWS_REGION ?? "us-east-1";
  const token = env.AWS_BEARER_TOKEN_BEDROCK;

  if (!token) {
    throw new Error("BEDROCK_NOT_CONFIGURED");
  }

  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${input.model}/invoke`;
  const isAnthropic = input.model.startsWith("anthropic.");
  const payload = isAnthropic
    ? {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: input.maxTokens,
        temperature: input.temperature,
        messages: input.messages.map((message) => ({ role: message.role, content: message.content }))
      }
    : {
        max_tokens: input.maxTokens,
        temperature: input.temperature,
        messages: input.messages,
        prompt: buildPromptFromMessages(input.messages)
      };

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    },
    30_000
  );

  const payloadJson = await readJsonBody(response);
  if (!response.ok) {
    throw new Error(`BEDROCK_ERROR:${response.status}:${payloadJson?.message ?? payloadJson?.error ?? "request failed"}`);
  }

  const content =
    payloadJson?.content?.[0]?.text ??
    payloadJson?.output?.message?.content?.[0]?.text ??
    payloadJson?.output_text ??
    payloadJson?.completion ??
    "";

  return { model: input.model, content };
}

async function callAzureChat(env: ReturnType<typeof loadEnv>, input: { model: string; messages: Array<{ role: LlmRole; content: string }>; temperature: number; maxTokens: number }) {
  if (!env.AZURE_AI_ENDPOINT || !env.AZURE_AI_KEY) {
    throw new Error("AZURE_NOT_CONFIGURED");
  }
  const apiVersion = env.AZURE_AI_API_VERSION ?? "2024-05-01-preview";
  const url = new URL("/models/chat/completions", env.AZURE_AI_ENDPOINT);
  url.searchParams.set("api-version", apiVersion);

  const response = await fetchWithTimeout(url.toString(),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${env.AZURE_AI_KEY}`
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        temperature: input.temperature,
        max_tokens: input.maxTokens
      })
    },
    30_000
  );

  const payload = await readJsonBody(response);
  if (!response.ok) {
    throw new Error(`AZURE_ERROR:${response.status}:${payload?.error?.message ?? "request failed"}`);
  }

  const content = payload?.choices?.[0]?.message?.content ?? "";
  return { model: payload?.model ?? input.model, content };
}

async function callOpenAiChat(env: ReturnType<typeof loadEnv>, input: { model: string; messages: Array<{ role: LlmRole; content: string }>; temperature: number; maxTokens: number }) {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }
  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        temperature: input.temperature,
        max_tokens: input.maxTokens
      })
    },
    30_000
  );

  const payload = await readJsonBody(response);
  if (!response.ok) {
    throw new Error(`OPENAI_ERROR:${response.status}:${payload?.error?.message ?? "request failed"}`);
  }

  const content = payload?.choices?.[0]?.message?.content ?? "";
  return { model: payload?.model ?? input.model, content };
}

async function callAimlChat(env: ReturnType<typeof loadEnv>, input: { model: string; messages: Array<{ role: LlmRole; content: string }>; temperature: number; maxTokens: number }) {
  if (!env.AIMLAPI_KEY) {
    throw new Error("AIML_NOT_CONFIGURED");
  }
  const response = await fetchWithTimeout(
    "https://api.aimlapi.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${env.AIMLAPI_KEY}`
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        temperature: input.temperature,
        max_tokens: input.maxTokens
      })
    },
    30_000
  );

  const payload = await readJsonBody(response);
  if (!response.ok) {
    throw new Error(`AIML_ERROR:${response.status}:${payload?.error?.message ?? "request failed"}`);
  }

  const content = payload?.choices?.[0]?.message?.content ?? "";
  return { model: payload?.model ?? input.model, content };
}

async function callAnthropicChat(env: ReturnType<typeof loadEnv>, input: { model: string; messages: Array<{ role: LlmRole; content: string }>; temperature: number; maxTokens: number }) {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_NOT_CONFIGURED");
  }
  const system = input.messages.find((message) => message.role === "system")?.content ?? "";
  const messages = input.messages.filter((message) => message.role !== "system");

  const response = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": env.ANTHROPIC_API_KEY
      },
      body: JSON.stringify({
        model: input.model,
        max_tokens: input.maxTokens,
        temperature: input.temperature,
        system: system || undefined,
        messages: messages.map((message) => ({ role: message.role, content: message.content }))
      })
    },
    30_000
  );

  const payload = await readJsonBody(response);
  if (!response.ok) {
    throw new Error(`ANTHROPIC_ERROR:${response.status}:${payload?.error?.message ?? "request failed"}`);
  }

  const content = Array.isArray(payload?.content)
    ? payload.content.map((block: { text?: string }) => block.text ?? "").join("")
    : payload?.content?.text ?? "";
  return { model: payload?.model ?? input.model, content };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readJsonBody(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

function broadcastEvent(event: TEventEnvelope): void {
  const sockets = wsSubscribers.get(event.tenantId);
  if (!sockets || sockets.size === 0) {
    return;
  }

  const payload = JSON.stringify(event);
  for (const socket of sockets) {
    if (socket.readyState === 1) {
      socket.send(payload);
    }
  }
}

async function authenticateRequest(request: FastifyRequest): Promise<Principal> {
  const authHeader = request.headers.authorization;
  const apiKey = request.headers["x-api-key"];

  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length);
    const claims = verifyJwt(token, env.JWT_SECRET, env.JWT_ISSUER, env.JWT_AUDIENCE);
    return {
      tenantId: claims.tenantId,
      userId: claims.sub,
      role: claims.role,
      scopes: claims.scopes,
      method: "jwt"
    };
  }

  if (typeof apiKey === "string" && apiKey.length > 10) {
    const prefix = apiKey.slice(0, 10);
    const record = findApiKeyByPrefix(prefix);
    if (!record) {
      throw new Error("INVALID_API_KEY");
    }

    const valid = verifyApiKey(apiKey, record.keyHash);
    if (!valid) {
      throw new Error("INVALID_API_KEY");
    }

    updateApiKeyLastUsed(record.apiKeyId);
    return {
      tenantId: record.tenantId,
      userId: record.userId,
      role: "member",
      scopes: record.scopes,
      method: "api-key"
    };
  }

  if (env.NODE_ENV !== "production") {
    const tenantId = request.headers["x-tenant-id"];
    const userId = request.headers["x-user-id"];
    const role = request.headers["x-role"];
    if (typeof tenantId === "string" && typeof userId === "string") {
      return {
        tenantId,
        userId,
        role: (typeof role === "string" ? role : "owner") as Role,
        scopes: ["jobs:read", "jobs:write", "keys:read", "keys:write", "settings:read", "settings:write"],
        method: "dev"
      };
    }
  }

  throw new Error("UNAUTHORIZED");
}

function getPrincipal(request: FastifyRequest): Principal {
  const principal = request.principal;
  if (!principal) {
    throw new Error("UNAUTHORIZED");
  }
  return principal;
}

function validationError(reply: FastifyReply, issues: unknown): FastifyReply {
  return reply.code(400).send({ code: "VALIDATION_ERROR", message: "invalid request", issues });
}

function forbidden(reply: FastifyReply): FastifyReply {
  return reply.code(403).send({ code: "FORBIDDEN", message: "insufficient permissions" });
}

function mapJobTypeToQueue(type: "ingest" | "convert" | "stt" | "tts" | "ocr" | "pipeline"): "ingest" | "extract" | "convert" | "ocr" | "stt" | "tts" {
  switch (type) {
    case "stt":
      return "stt";
    case "tts":
      return "tts";
    case "ocr":
      return "ocr";
    case "convert":
      return "convert";
    case "pipeline":
      return "extract";
    case "ingest":
      return "ingest";
  }
}

async function signUploadPartUrl(
  env: ReturnType<typeof loadEnv>,
  uploadId: string,
  storageKey: string,
  contentType: string,
  partNumber: number
) {
  const objectKey = `${storageKey}.part-${partNumber}`;
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    return issueSupabaseSignedUploadUrl({
      supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      bucket: env.SUPABASE_STORAGE_BUCKET_UPLOADS,
      objectKey,
      expiresSeconds: 15 * 60
    });
  }

  return issueSignedUrl({
    baseUrl: env.OBJECT_STORE_BASE_URL,
    bucket: env.OBJECT_STORE_BUCKET,
    objectKey,
    method: "PUT",
    expiresSeconds: 15 * 60,
    secret: env.SIGNED_URL_SECRET,
    extraQuery: { uploadId, partNumber },
    headers: { "content-type": contentType }
  });
}

declare module "fastify" {
  interface FastifyRequest {
    principal?: Principal;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = buildServer();
  app
    .listen({ port: env.PORT, host: "0.0.0.0" })
    .then(() => {
      log({ level: "info", service: "api", message: `api listening on ${env.PORT}` });
    })
    .catch((error) => {
      log({ level: "error", service: "api", message: "api failed to start", fields: { error: (error as Error).message } });
      process.exitCode = 1;
    });
}
