import assert from "node:assert/strict";
import test from "node:test";
import { redactPII } from "../../packages/observability/src/index.js";

test("observability redaction", () => {
  const redacted = redactPII({ email: "x@y.com", message: "ok", token: "abc" });
  assert.equal(redacted.email, "[REDACTED]");
  assert.equal(redacted.token, "[REDACTED]");
  assert.equal(redacted.message, "ok");
});
