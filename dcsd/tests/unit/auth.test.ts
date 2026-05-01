import assert from "node:assert/strict";
import test from "node:test";
import { can, generateApiKey, signJwt, verifyApiKey, verifyJwt } from "../../packages/auth/src/index.js";

test("jwt signing and verification", () => {
  const secret = "this-is-a-long-enough-secret";
  const token = signJwt(
    {
      sub: "user-1",
      tenantId: "tenant-1",
      role: "owner",
      scopes: ["jobs:read"],
      ttlSeconds: 60,
      iss: "issuer",
      aud: "audience"
    },
    secret
  );

  const decoded = verifyJwt(token, secret, "issuer", "audience");
  assert.equal(decoded.sub, "user-1");
  assert.equal(decoded.tenantId, "tenant-1");
});

test("api key generation and verification", () => {
  const key = generateApiKey();
  assert.ok(key.plainText.startsWith("sp_"));
  assert.equal(verifyApiKey(key.plainText, key.keyHash), true);
  assert.equal(can("viewer", "jobs:write"), false);
});
