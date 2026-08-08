import CryptoJS from "crypto-js";
import { printableRatio } from "./englishStats.js";

/** Stricter validity check than raw printable-ratio alone — short garbage can
 *  accidentally look "printable" and cause false positives. Real decrypted
 *  English text is reasonably long, near-100% printable, and contains spaces. */
function looksLikeValidPlaintext(text) {
  if (!text || text.length < 8) return false;
  if (printableRatio(text) < 0.98) return false;
  if (!text.includes(" ")) return false;
  return true;
}

const CIPHERS = {
  AES: CryptoJS.AES,
  DES: CryptoJS.DES,
  TripleDES: CryptoJS.TripleDES,
  RC4: CryptoJS.RC4,
  Rabbit: CryptoJS.Rabbit,
};

function* numericKeys(length) {
  const max = Math.pow(10, length);
  for (let i = 0; i < max; i++) {
    yield String(i).padStart(length, "0");
  }
}

const ALPHANUMERIC_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const FULL_CHARS = ALPHANUMERIC_CHARS + "!@#$%^&*()_+-=[]{}|;:,.<>?";

function* charsetKeys(length, charset) {
  const total = Math.pow(charset.length, length);
  for (let i = 0; i < total; i++) {
    let n = i;
    let key = "";
    for (let j = 0; j < length; j++) {
      key = charset[n % charset.length] + key;
      n = Math.floor(n / charset.length);
    }
    yield key;
  }
}

function* alphanumericKeys(length) {
  yield* charsetKeys(length, ALPHANUMERIC_CHARS);
}

function* fullCharsetKeys(length) {
  yield* charsetKeys(length, FULL_CHARS);
}

export function estimateKeyspaceSize(keyType, length) {
  if (keyType === "numeric") return Math.pow(10, length);
  if (keyType === "alphanumeric") return Math.pow(ALPHANUMERIC_CHARS.length, length);
  return Math.pow(FULL_CHARS.length, length); // "full"
}

/**
 * Runs a brute-force search against a ciphertext, trying every key in the
 * given space. Chunked with setTimeout(0) between batches so the browser
 * tab stays responsive and the UI can show progress / allow cancellation.
 *
 * onProgress(triedCount, totalCount)
 * onFound(candidate) — called for every plausible match (doesn't stop automatically,
 *   since a false positive can occur; caller decides when to stop)
 * Returns a controller with a `cancel()` method.
 */
export function runBruteForce({
  ciphertext,
  algorithm,
  keyType,
  length,
  onProgress,
  onFound,
  onDone,
  chunkSize = 500,
}) {
  const cipher = CIPHERS[algorithm];
  const generator =
    keyType === "numeric" ? numericKeys(length) : keyType === "alphanumeric" ? alphanumericKeys(length) : fullCharsetKeys(length);
  const total = estimateKeyspaceSize(keyType, length);

  let cancelled = false;
  let tried = 0;

  function processChunk() {
    if (cancelled) return;
    let count = 0;
    let next;
    while (count < chunkSize && !(next = generator.next()).done) {
      const key = next.value;
      tried++;
      count++;
      try {
        const decrypted = cipher.decrypt(ciphertext, key);
        const text = decrypted.toString(CryptoJS.enc.Utf8);
        if (looksLikeValidPlaintext(text)) {
          onFound({ key, plaintext: text });
        }
      } catch {
        // wrong key produced invalid padding/utf8 - expected for almost all attempts
      }
    }

    onProgress(tried, total);

    if (next && next.done) {
      onDone();
      return;
    }
    if (!cancelled) setTimeout(processChunk, 0);
  }

  setTimeout(processChunk, 0);

  return {
    cancel: () => {
      cancelled = true;
    },
  };
}
