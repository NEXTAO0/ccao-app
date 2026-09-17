import crypto from "node:crypto";
import type { GcpCredentials } from "./types";

// [MANUAL_SETUP_REQUIRED]: CRYPTO_SECRET must be a 32-byte value (base64 or raw hex).
// Generate with: openssl rand -base64 32, then set it as an environment secret.
const CRYPTO_SECRET: string | undefined = process.env.CRYPTO_SECRET;

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer | null {
  if (!CRYPTO_SECRET) return null;
  // Accept either a base64 blob (>=32 bytes decoded) or a raw 32-char hex secret.
  const candidates: Buffer[] = [Buffer.from(CRYPTO_SECRET, "base64")];
  if (/^[0-9a-fA-F]{64}$/.test(CRYPTO_SECRET)) {
    candidates.push(Buffer.from(CRYPTO_SECRET, "hex"));
  }
  const key = candidates.find((c) => c.length === 32);
  return key ?? null;
}

/** Encrypts a sensitive JSON blob (e.g. GCP service-account key) for storage. */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  if (!key) {
    throw new Error("CRYPTO_SECRET is not configured; refusing to store plaintext credentials.");
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/** Decrypts a blob written by encryptSecret. Returns null when malformed. */
export function decryptSecret(payload: string): string {
  const key = getKey();
  if (!key) {
    throw new Error("CRYPTO_SECRET is not configured; refusing to decrypt credentials.");
  }
  const buf = Buffer.from(payload, "base64");
  if (buf.length < 28) return "";
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8"
  );
}

export function encryptGcpCredentials(creds: GcpCredentials): string {
  return encryptSecret(JSON.stringify(creds));
}

export function decryptGcpCredentials(payload: string): GcpCredentials | null {
  try {
    const raw = decryptSecret(payload);
    const parsed = JSON.parse(raw) as GcpCredentials;
    if (!parsed.client_email || !parsed.private_key) return null;
    return parsed;
  } catch {
    return null;
  }
}