/* ─────────────────────────────────────────────────
   SecureDocChain — AES-256-GCM Client-Side Encryption
   Uses the Web Crypto API (browser-native, zero dependencies).
   Raw file bytes NEVER leave the browser unencrypted.
   ───────────────────────────────────────────────── */

/** Encrypted payload stored alongside the IPFS CID */
export interface EncryptedPayload {
  /** Base64-encoded AES-256-GCM encrypted bytes */
  ciphertext: string;
  /** Base64-encoded 12-byte IV */
  iv: string;
  /** Hex-encoded raw AES key (to be wrapped per-recipient) */
  rawKeyHex: string;
}

/* ── Key Generation ────────────────────────────── */

/** Generate a random 256-bit AES-GCM key */
export async function generateAESKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true, // extractable — needed to wrap for recipients
    ["encrypt", "decrypt"]
  );
}

/** Export a CryptoKey to a hex string (for wrapping / storage) */
export async function exportKeyToHex(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bufferToHex(raw);
}

/** Import a hex-encoded key back to a CryptoKey */
export async function importKeyFromHex(hex: string): Promise<CryptoKey> {
  const raw = hexToBuffer(hex);
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

/* ── Encryption ────────────────────────────────── */

/**
 * Encrypt a File using AES-256-GCM.
 * Returns the encrypted blob (ready to upload) + key info.
 */
export async function encryptFile(file: File): Promise<{ encryptedBlob: Blob; payload: EncryptedPayload }> {
  // 1. Generate a fresh AES key
  const key = await generateAESKey();

  // 2. Generate a random 12-byte IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 3. Read file bytes
  const plaintext = await file.arrayBuffer();

  // 4. Encrypt with AES-256-GCM
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    key,
    plaintext
  );

  // 5. Export key for wrapping
  const rawKeyHex = await exportKeyToHex(key);

  // 6. Build the encrypted blob (IV prefix + ciphertext)
  const encryptedBlob = new Blob([iv, ciphertext], { type: "application/octet-stream" });

  return {
    encryptedBlob,
    payload: {
      ciphertext: bufferToBase64(ciphertext),
      iv: bufferToBase64(iv.buffer),
      rawKeyHex,
    },
  };
}

/**
 * Decrypt an encrypted blob back to the original file bytes.
 * @param encryptedData ArrayBuffer of (12-byte IV + ciphertext)
 * @param keyHex Hex-encoded AES key
 */
export async function decryptFile(encryptedData: ArrayBuffer, keyHex: string): Promise<ArrayBuffer> {
  const data = new Uint8Array(encryptedData);

  // First 12 bytes = IV
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);

  const key = await importKeyFromHex(keyHex);

  return crypto.subtle.decrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, ciphertext);
}

/* ── Buffer Utilities ──────────────────────────── */

export function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
