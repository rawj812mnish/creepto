import CryptoJS from "crypto-js";

async function deriveGcmKeyBytes(passphrase, keySizeBits) {
  // SHA-256 the passphrase, then take the first N bytes for the requested key size.
  const hashHex = CryptoJS.SHA256(passphrase).toString(CryptoJS.enc.Hex);
  const fullBytes = hexToBytes(hashHex);
  return fullBytes.slice(0, keySizeBits / 8);
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * AES-GCM encrypt using the browser's native SubtleCrypto.
 * Output = base64(iv (12 bytes) || ciphertext+authTag), self-contained.
 */
export async function aesGcmEncrypt(plaintext, passphrase, keySizeBits) {
  const keyBytes = await deriveGcmKeyBytes(passphrase, keySizeBits);
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encoded
  );
  const combined = new Uint8Array(iv.length + ciphertextBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertextBuffer), iv.length);
  return bytesToBase64(combined);
}

/** Reverses aesGcmEncrypt — expects base64(iv || ciphertext+authTag). */
export async function aesGcmDecrypt(base64Combined, passphrase, keySizeBits) {
  const keyBytes = await deriveGcmKeyBytes(passphrase, keySizeBits);
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  const combined = base64ToBytes(base64Combined);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plainBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    ciphertext
  );
  return new TextDecoder().decode(plainBuffer);
}
