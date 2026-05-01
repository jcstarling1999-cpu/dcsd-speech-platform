import assert from "node:assert/strict";
import test from "node:test";
import { detectFileType, issueSignedUrl, sha256Hex } from "../../packages/storage/src/index.js";

test("signed url includes signature and expiry", () => {
  const signed = issueSignedUrl({
    baseUrl: "https://object.local",
    bucket: "speech",
    objectKey: "raw/file.wav",
    method: "PUT",
    expiresSeconds: 300,
    secret: "secret-secret-secret"
  });

  assert.ok(signed.url.includes("sig="));
  assert.ok(signed.url.includes("expires="));
  assert.equal(sha256Hex("abc").length, 64);
});

test("file detection", () => {
  const image = detectFileType("scan.tiff", "image/tiff");
  assert.equal(image.family, "image");
  assert.equal(image.likelyNeedsOcr, true);

  const audio = detectFileType("voice.mp3", "audio/mpeg");
  assert.equal(audio.family, "audio");
});
