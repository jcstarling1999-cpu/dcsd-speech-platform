import assert from "node:assert/strict";
import test from "node:test";
import { loadEnv } from "../../packages/config/src/index.js";

test("env loader applies defaults", () => {
  const env = loadEnv({});
  assert.equal(env.PORT, 8080);
  assert.equal(env.COST_ROUTING_MODE_DEFAULT, "balanced");
});

test("strict validation fails when required credentials are missing", () => {
  assert.throws(
    () =>
      loadEnv({
        NODE_ENV: "production",
        ENABLE_PROVIDER_AZURE: "true"
      }),
    /ENV_VALIDATION_FAILED/
  );
});

test("strict validation passes with minimum azure primary credentials", () => {
  const env = loadEnv({
    NODE_ENV: "production",
    UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "token",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
    SUPABASE_SERVICE_ROLE_KEY: "service",
    SIGNED_URL_SECRET: "this-is-a-long-signed-url-secret",
    JWT_SECRET: "this-is-a-long-jwt-secret",
    ENABLE_PROVIDER_AZURE: "true",
    AZURE_AI_KEY: "key",
    AZURE_AI_ENDPOINT: "https://example.azure.com",
    AZURE_REGION: "eastus2"
  });

  assert.equal(env.NODE_ENV, "production");
  assert.equal(env.AZURE_REGION, "eastus2");
});

test("alias env names are accepted and normalized", () => {
  const env = loadEnv({
    ENABLE_AZURE: "true",
    ENABLE_PROVIDER_AZURE: "false",
    AIML_API_KEY: "alias-key"
  });

  assert.equal(env.ENABLE_PROVIDER_AZURE, true);
  assert.equal(env.AIMLAPI_KEY, "alias-key");
});
