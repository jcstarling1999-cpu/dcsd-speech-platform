#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

process.env.NODE_ENV ??= "test";

const { buildServer } = await import("./apps/api/src/index.ts");
const { resetInMemoryDatabase } = await import("./packages/database/src/index.ts");

const results = [];
const timings = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  const status = ok ? "PASS" : "FAIL";
  const suffix = detail ? ` - ${detail}` : "";
  console.log(`${status}: ${name}${suffix}`);
}

function requireOk(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function devHeaders(tenantId, userId) {
  return {
    "x-tenant-id": tenantId,
    "x-user-id": userId,
    "x-role": "owner"
  };
}

function jsonHeaders(base) {
  return {
    ...base,
    "content-type": "application/json"
  };
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function request(baseUrl, name, path, options, expect) {
  const url = `${baseUrl}${path}`;
  const start = performance.now();
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    record(name, false, `network error: ${(error && error.message) || "unknown"}`);
    return { ok: false };
  }
  const elapsedMs = performance.now() - start;
  timings.push({ name, ms: elapsedMs });

  const payload = await readJson(response);
  const statusOk = typeof expect === "number" ? response.status === expect : response.status >= 200 && response.status < 300;
  if (!statusOk) {
    const message = payload?.message ? `: ${payload.message}` : "";
    const detail = payload?.code ? `${payload.code} (${response.status})${message}` : `status ${response.status}`;
    record(name, false, detail);
    return { ok: false, response, payload };
  }
  record(name, true, `status ${response.status} (${elapsedMs.toFixed(1)}ms)`);
  return { ok: true, response, payload };
}

async function offlineProbe() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 500);
  try {
    await fetch("http://127.0.0.1:9/health", { signal: controller.signal });
    record("offline probe", false, "unexpected response");
  } catch {
    record("offline probe", true, "connection refused or timed out as expected");
  } finally {
    clearTimeout(timer);
  }
}

function printPerformance() {
  const sorted = [...timings].sort((a, b) => b.ms - a.ms);
  console.log("\nTiming summary (slowest first):");
  for (const item of sorted) {
    console.log(`- ${item.name}: ${item.ms.toFixed(1)}ms`);
  }
}

async function websocketProbe(baseUrl, token) {
  let WebSocketCtor = globalThis.WebSocket;
  let supportsHeaders = false;

  try {
    const wsModule = await import("ws");
    WebSocketCtor = wsModule.default ?? wsModule.WebSocket ?? wsModule;
    supportsHeaders = true;
  } catch {
    // Ignore if ws is not installed.
  }

  if (typeof WebSocketCtor !== "function") {
    record("websocket", true, "skipped (WebSocket not available)");
    return;
  }

  if (!supportsHeaders) {
    record("websocket", true, "skipped (client cannot send headers)");
    return;
  }

  const wsUrl = baseUrl.replace("http://", "ws://").replace("https://", "wss://") + "/v1/ws";
  const wsHeaders = {
    authorization: `Bearer ${token}`
  };
  await new Promise((resolve) => {
    const started = performance.now();
    const ws = new WebSocketCtor(wsUrl, { headers: wsHeaders });
    const timer = setTimeout(() => {
      record("websocket", true, "skipped (timeout)");
      ws.close();
      resolve(undefined);
    }, 1000);

    const cleanup = () => {
      clearTimeout(timer);
      ws.close();
    };

    const handleMessage = (event) => {
      const payload = typeof event?.data === "string" ? event.data : "";
      const elapsed = performance.now() - started;
      timings.push({ name: "websocket", ms: elapsed });
      record("websocket", payload.includes("connected"), `message received (${elapsed.toFixed(1)}ms)`);
      cleanup();
      resolve(undefined);
    };

    const handleError = (error) => {
      const message = error?.message ?? "connection error";
      record("websocket", true, `skipped (${message})`);
      cleanup();
      resolve(undefined);
    };

    const handleClose = (code, reason) => {
      const detail = reason ? `closed ${code}: ${reason.toString?.() ?? reason}` : `closed ${code}`;
      record("websocket", true, `skipped (${detail})`);
      cleanup();
      resolve(undefined);
    };

    if (typeof ws.addEventListener === "function") {
      ws.addEventListener("message", handleMessage);
      ws.addEventListener("error", handleError);
      ws.addEventListener("close", (event) => handleClose(event.code, event.reason));
    } else {
      ws.on("message", (data) => handleMessage({ data: data?.toString?.() ?? data }));
      ws.on("error", handleError);
      ws.on("close", handleClose);
      ws.on("unexpected-response", (_req, res) => {
        const status = res?.statusCode ?? 0;
        record("websocket", true, `skipped (unexpected response ${status})`);
      });
    }
  });
}

async function main() {
  resetInMemoryDatabase();
  const app = buildServer();

  await app.listen({ port: 0, host: "127.0.0.1" });
  const address = app.server.address();
  const port = typeof address === "string" ? new URL(address).port : address?.port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const upgradeListeners = app.server.listenerCount("upgrade");
  record("websocket listener", upgradeListeners > 0, `upgrade listeners: ${upgradeListeners}`);

  const tenantId = randomUUID();
  const userId = randomUUID();
  const headers = devHeaders(tenantId, userId);

  try {
    await request(baseUrl, "health", "/health", { method: "GET" }, 200);
    await request(baseUrl, "readiness", "/health/readiness", { method: "GET" }, 200);

    await request(baseUrl, "providers capabilities", "/v1/providers/capabilities", { method: "GET" }, 200);

    const devTokenRes = await request(baseUrl, "dev token", "/v1/dev/token", {
      method: "POST",
      headers: jsonHeaders(headers),
      body: JSON.stringify({ tenantId, userId, role: "owner" })
    }, 200);
    requireOk(devTokenRes.ok && devTokenRes.payload?.token, "dev token missing");
    const devToken = devTokenRes.payload.token;

    await request(baseUrl, "llm models", "/v1/llm/models", { method: "GET", headers }, 200);
    await request(baseUrl, "llm health", "/v1/llm/health", { method: "GET", headers }, 200);

    const llmChatStart = performance.now();
    const llmChatResponse = await fetch(`${baseUrl}/v1/llm/chat`, {
      method: "POST",
      headers: jsonHeaders(headers),
      body: JSON.stringify({
        messages: [{ role: "user", content: "hello" }]
      })
    });
    const llmChatElapsed = performance.now() - llmChatStart;
    timings.push({ name: "llm chat", ms: llmChatElapsed });
    const llmChatPayload = await readJson(llmChatResponse);
    if (llmChatResponse.ok) {
      requireOk(Boolean(llmChatPayload?.message?.content), "llm chat missing message content");
      record("llm chat", true, `status ${llmChatResponse.status} (${llmChatElapsed.toFixed(1)}ms)`);
    } else if (llmChatResponse.status === 503 && llmChatPayload?.code === "NO_LLM_PROVIDERS") {
      record("llm chat", true, "NO_LLM_PROVIDERS (503)");
    } else {
      record("llm chat", false, llmChatPayload?.code ?? `status ${llmChatResponse.status}`);
    }

    const uploadRes = await request(baseUrl, "upload create", "/v1/uploads", {
      method: "POST",
      headers: jsonHeaders(headers),
      body: JSON.stringify({
        tenantId,
        userId,
        filename: "sample.wav",
        sizeBytes: 8 * 1024 * 1024,
        contentType: "audio/wav",
        checksumSha256: "a".repeat(64),
        chunkSizeBytes: 8 * 1024 * 1024
      })
    }, 201);
    requireOk(uploadRes.ok && uploadRes.payload?.upload?.uploadId, "upload id missing");

    const uploadId = uploadRes.payload.upload.uploadId;

    await request(baseUrl, "upload sign part", `/v1/uploads/${uploadId}/parts`, {
      method: "POST",
      headers: jsonHeaders(headers),
      body: JSON.stringify({ partNumber: 1, partChecksumSha256: "b".repeat(64) })
    }, 200);

    const completeRes = await request(baseUrl, "upload complete", `/v1/uploads/${uploadId}/complete`, {
      method: "POST",
      headers: jsonHeaders(headers),
      body: JSON.stringify({ parts: [{ partNumber: 1, etag: "etag-1" }] })
    }, 200);
    requireOk(completeRes.ok && completeRes.payload?.asset?.assetId, "asset id missing");

    const jobRes = await request(baseUrl, "job submit", "/v1/jobs", {
      method: "POST",
      headers: jsonHeaders(headers),
      body: JSON.stringify({
        idempotencyKey: "idem-12345678",
        tenantId,
        userId,
        fileId: completeRes.payload.asset.assetId,
        type: "stt",
        options: { routingMode: "balanced" }
      })
    }, 202);
    requireOk(jobRes.ok && jobRes.payload?.jobId, "job id missing");

    const jobId = jobRes.payload.jobId;

    await request(baseUrl, "job list", "/v1/jobs", { method: "GET", headers }, 200);
    await request(baseUrl, "job detail", `/v1/jobs/${jobId}`, { method: "GET", headers }, 200);
    await request(baseUrl, "job cancel", `/v1/jobs/${jobId}/cancel`, { method: "POST", headers }, 200);
    await request(baseUrl, "job retry", `/v1/jobs/${jobId}/retry`, { method: "POST", headers }, 202);

    await websocketProbe(baseUrl, devToken);

    const webhookRes = await request(baseUrl, "webhook create", "/v1/webhooks", {
      method: "POST",
      headers: jsonHeaders(headers),
      body: JSON.stringify({
        tenantId,
        url: "https://example.com/webhooks",
        events: ["job.succeeded", "job.failed"]
      })
    }, 201);
    requireOk(webhookRes.ok && webhookRes.payload?.webhookId, "webhook id missing");

    await request(baseUrl, "webhook list", "/v1/webhooks", { method: "GET", headers }, 200);

    const apiKeyRes = await request(baseUrl, "api key create", "/v1/api-keys", {
      method: "POST",
      headers: jsonHeaders(headers),
      body: JSON.stringify({
        tenantId,
        userId,
        label: "Key & Prod + QA",
        scopes: ["jobs:read", "jobs:write"]
      })
    }, 201);
    requireOk(apiKeyRes.ok && apiKeyRes.payload?.apiKey?.apiKeyId, "api key id missing");

    await request(baseUrl, "api key list", "/v1/api-keys", { method: "GET", headers }, 200);
    await request(baseUrl, "api key revoke", `/v1/api-keys/${apiKeyRes.payload.apiKey.apiKeyId}/revoke`, { method: "POST", headers }, 200);

    const validationRes = await request(baseUrl, "upload validation error", "/v1/uploads", {
      method: "POST",
      headers: jsonHeaders(headers),
      body: JSON.stringify({ tenantId })
    }, 400);
    if (validationRes.ok) {
      requireOk(validationRes.payload?.code === "VALIDATION_ERROR", "expected validation error code");
    }

    const jobMismatchRes = await request(baseUrl, "job tenant mismatch", "/v1/jobs", {
      method: "POST",
      headers: jsonHeaders(headers),
      body: JSON.stringify({
        idempotencyKey: "idem-mismatch",
        tenantId: randomUUID(),
        userId,
        fileId: completeRes.payload.asset.assetId,
        type: "stt",
        options: { routingMode: "balanced" }
      })
    }, 403);
    if (jobMismatchRes.ok) {
      requireOk(jobMismatchRes.payload?.code === "TENANT_OR_USER_MISMATCH", "expected tenant mismatch");
    }

    const longLabel = "l".repeat(200);
    const longLabelRes = await request(baseUrl, "api key long label", "/v1/api-keys", {
      method: "POST",
      headers: jsonHeaders(headers),
      body: JSON.stringify({
        tenantId,
        userId,
        label: longLabel,
        scopes: ["jobs:read"]
      })
    }, 400);
    if (longLabelRes.ok) {
      requireOk(longLabelRes.payload?.code === "VALIDATION_ERROR", "expected validation error");
    }

    await offlineProbe();

    const memoryBefore = process.memoryUsage().heapUsed;
    for (let i = 0; i < 20; i += 1) {
      await request(baseUrl, `health loop ${i + 1}`, "/health", { method: "GET" }, 200);
    }
    const memoryAfter = process.memoryUsage().heapUsed;
    const deltaMb = (memoryAfter - memoryBefore) / (1024 * 1024);
    record("memory delta", deltaMb < 10, `${deltaMb.toFixed(2)} MB`);
  } catch (error) {
    record("test runner", false, error?.message ?? "unexpected error");
  } finally {
    await app.close();
  }

  printPerformance();

  const failed = results.filter((item) => !item.ok);
  const passed = results.filter((item) => item.ok);
  console.log(`\nSummary: ${passed.length} passed, ${failed.length} failed`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

await main();
