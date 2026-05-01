import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type Role = "owner" | "admin" | "member" | "viewer" | "support";

const permissionsByRole: Record<Role, Set<string>> = {
  owner: new Set(["jobs:read", "jobs:write", "keys:read", "keys:write", "settings:read", "settings:write", "audit:read"]),
  admin: new Set(["jobs:read", "jobs:write", "keys:read", "keys:write", "settings:read", "settings:write", "audit:read"]),
  member: new Set(["jobs:read", "jobs:write", "keys:read", "keys:write"]),
  viewer: new Set(["jobs:read", "keys:read"]),
  support: new Set(["jobs:read", "audit:read"])
};

export interface AuthClaims {
  sub: string;
  tenantId: string;
  role: Role;
  scopes: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Buffer {
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}

export function signJwt(claims: Omit<AuthClaims, "iat" | "exp"> & { ttlSeconds: number }, secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthClaims = {
    ...claims,
    iat: now,
    exp: now + claims.ttlSeconds
  };

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", secret).update(signingInput).digest();

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

export function verifyJwt(token: string, secret: string, expectedIssuer: string, expectedAudience: string): AuthClaims {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error("INVALID_JWT_FORMAT");
  }

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac("sha256", secret).update(signingInput).digest();
  const actualSignature = base64UrlDecode(encodedSignature);

  if (expectedSignature.length !== actualSignature.length || !timingSafeEqual(expectedSignature, actualSignature)) {
    throw new Error("INVALID_JWT_SIGNATURE");
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as AuthClaims;

  if (payload.iss !== expectedIssuer || payload.aud !== expectedAudience) {
    throw new Error("INVALID_JWT_AUD_ISS");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error("JWT_EXPIRED");
  }

  return payload;
}

export function can(role: Role, permission: string): boolean {
  return permissionsByRole[role].has(permission);
}

export function assertPermission(role: Role, permission: string): void {
  if (!can(role, permission)) {
    throw new Error("FORBIDDEN");
  }
}

export interface GeneratedApiKey {
  plainText: string;
  keyPrefix: string;
  keyHash: string;
}

export function generateApiKey(): GeneratedApiKey {
  const raw = `sp_${randomBytes(24).toString("base64url")}`;
  return {
    plainText: raw,
    keyPrefix: raw.slice(0, 10),
    keyHash: hashApiKey(raw)
  };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function verifyApiKey(candidate: string, storedHash: string): boolean {
  const digest = hashApiKey(candidate);
  const a = Buffer.from(digest, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
