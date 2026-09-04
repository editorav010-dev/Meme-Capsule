/**
 * AES-GCM-256 Cryptographic Utilities for Securing Sensitive Data at Rest (API Keys)
 * Compatible with Cloudflare Workers / Pages runtime (Web Crypto API).
 */

const ENCRYPTION_PREFIX = "enc:v1:";

/**
 * Derives a consistent 256-bit AES-GCM CryptoKey from a secret seed string using SHA-256.
 */
async function deriveAesKey(secretSeed: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = enc.encode(secretSeed || "meme-capsule-default-sec-key-2026");
  const hash = await crypto.subtle.digest("SHA-256", keyMaterial);

  return crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function toHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hexStr: string): Uint8Array {
  const bytes = new Uint8Array(hexStr.length / 2);
  for (let i = 0; i < hexStr.length; i += 2) {
    bytes[i / 2] = parseInt(hexStr.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Encrypts a plaintext string (such as an API key) using AES-256-GCM.
 * Output format: "enc:v1:<iv_hex>:<ciphertext_hex>"
 */
export async function encryptApiKey(plainKey: string, secretSeed: string): Promise<string> {
  if (!plainKey || !plainKey.trim()) return "";
  const trimmed = plainKey.trim();

  // If already encrypted, return as-is
  if (trimmed.startsWith(ENCRYPTION_PREFIX)) {
    return trimmed;
  }

  const key = await deriveAesKey(secretSeed);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const enc = new TextEncoder();
  const encodedData = enc.encode(trimmed);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedData
  );

  const ivHex = toHex(iv);
  const cipherHex = toHex(new Uint8Array(ciphertext));

  return `${ENCRYPTION_PREFIX}${ivHex}:${cipherHex}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Gracefully returns unencrypted strings if legacy plaintext.
 */
export async function decryptApiKey(encryptedStr: string, secretSeed: string): Promise<string> {
  if (!encryptedStr || !encryptedStr.trim()) return "";
  const trimmed = encryptedStr.trim();

  // If legacy plaintext key, return as-is
  if (!trimmed.startsWith(ENCRYPTION_PREFIX)) {
    return trimmed;
  }

  try {
    const payload = trimmed.slice(ENCRYPTION_PREFIX.length);
    const parts = payload.split(":");
    if (parts.length !== 2) {
      return trimmed;
    }

    const iv = fromHex(parts[0]);
    const ciphertext = fromHex(parts[1]);

    const key = await deriveAesKey(secretSeed);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.error("Failed to decrypt API key:", err);
    return trimmed;
  }
}
