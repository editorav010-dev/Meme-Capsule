/**
 * Generates an anonymous device ID (SHA-256 of browser fingerprint).
 * Persisted in localStorage.
 */

const DEVICE_ID_KEY = "meme_drop_device_id";

// Simple fallback SHA-256 implementation using Web Crypto API
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

// Generates a basic browser fingerprint
function getBrowserFingerprint(): string {
  const { userAgent, language, hardwareConcurrency } = navigator;
  const screenResolution = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return [userAgent, language, hardwareConcurrency, screenResolution, timezone].join("||");
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing && existing.length === 64) {
    return existing;
  }

  // Generate new
  const fingerprint = getBrowserFingerprint();
  // Add some randomness to ensure uniqueness even if fingerprint matches
  const uniqueString = `${fingerprint}||${Date.now()}||${Math.random()}`;
  
  const id = await sha256(uniqueString);
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}
