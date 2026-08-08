import CryptoJS from "crypto-js";
import { caesarCrack, xorCrack, vigenereCrack, hashDictionaryCrack } from "./crackers.js";

const CIPHERS = {
  AES: CryptoJS.AES,
  DES: CryptoJS.DES,
  TripleDES: CryptoJS.TripleDES,
  RC4: CryptoJS.RC4,
  Rabbit: CryptoJS.Rabbit,
};

const COMMON_PASSWORDS = [
  "password", "123456", "12345678", "qwerty", "abc123", "monkey", "letmein",
  "dragon", "111111", "baseball", "iloveyou", "trustno1", "sunshine", "master",
  "welcome", "shadow", "ashley", "football", "jesus", "michael", "ninja",
  "mustang", "password1", "123456789", "admin", "root", "test", "guest",
  "hello", "freedom", "whatever", "hunter2", "superman", "batman", "login",
  "secret", "1234", "12345", "000000", "654321", "121212",
];

function looksLikeValidPlaintext(text) {
  if (!text || text.length < 8) return false;
  let printable = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if ((code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13) printable++;
  }
  if (printable / text.length < 0.98) return false;
  if (!text.includes(" ")) return false;
  return true;
}

const HASH_LENGTH_ALGOS = {
  32: "MD5",
  40: "SHA1",
  64: "SHA256",
  128: "SHA512",
};

/**
 * Tries every technique this app knows in order of speed/likelihood, stopping
 * at the first confident result. Falls back to a quick weak-key/common-password
 * sweep against our own ciphers before giving up. Returns a plain result object
 * rather than throwing, so the UI can show a clear "couldn't crack it" message.
 */
export async function autoCrack(input, onStatus = () => {}) {
  const trimmed = input.trim();
  if (!trimmed) return { success: false, message: "Enter some text first." };

  // 1. Hash detection by exact hex length
  if (/^[a-fA-F0-9]+$/.test(trimmed) && HASH_LENGTH_ALGOS[trimmed.length]) {
    const algo = HASH_LENGTH_ALGOS[trimmed.length];
    onStatus(`Looks like a ${algo} hash — checking common passwords...`);
    const r = hashDictionaryCrack(trimmed, algo);
    if (r.found) {
      return { success: true, technique: `Hash dictionary lookup (${algo})`, result: `Password: ${r.password}` };
    }
    return {
      success: false,
      message: `This looks like a ${algo} hash, but it's not in our common-password wordlist. Hashes can't be mathematically reversed — only guessed, and this one isn't a common word/password.`,
    };
  }

  const letterRatio = (trimmed.match(/[a-zA-Z]/g) || []).length / trimmed.length;

  // 2. Caesar cipher
  if (letterRatio > 0.6) {
    onStatus("Trying Caesar cipher (all 25 shifts)...");
    const results = caesarCrack(trimmed);
    if (results[0].score < 60) {
      return { success: true, technique: "Caesar cipher", result: results[0].plain };
    }
  }

  // 3. XOR (try hex-decoded bytes, then raw text bytes)
  onStatus("Trying repeating-key XOR...");
  const byteCandidates = [];
  if (/^[a-fA-F0-9]+$/.test(trimmed) && trimmed.length % 2 === 0) {
    const b = [];
    for (let i = 0; i < trimmed.length; i += 2) b.push(parseInt(trimmed.substr(i, 2), 16));
    byteCandidates.push(b);
  }
  byteCandidates.push(Array.from(trimmed).map((c) => c.charCodeAt(0)));
  for (const bytes of byteCandidates) {
    if (bytes.length < 8) continue;
    const results = xorCrack(bytes, 20);
    if (results[0].score < 80) {
      return { success: true, technique: `XOR cipher (key: "${results[0].key}")`, result: results[0].plaintext };
    }
  }

  // 4. Vigenere (needs enough letters to be reliable)
  const letterCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
  if (letterCount > 100) {
    onStatus("Trying Vigenère cipher...");
    const results = vigenereCrack(trimmed, 20);
    if (results[0].score < 80) {
      return { success: true, technique: `Vigenère cipher (key: "${results[0].key}")`, result: results[0].plaintext };
    }
  }

  // 5. Weak passphrase against our own ciphers - common password dictionary
  onStatus("Trying common passwords against AES/DES/TripleDES/RC4/Rabbit...");
  for (const [name, cipher] of Object.entries(CIPHERS)) {
    for (const pw of COMMON_PASSWORDS) {
      try {
        const text = cipher.decrypt(trimmed, pw).toString(CryptoJS.enc.Utf8);
        if (looksLikeValidPlaintext(text)) {
          return { success: true, technique: `Weak passphrase (${name}, key: "${pw}")`, result: text };
        }
      } catch {
        /* wrong key - expected for almost every attempt */
      }
    }
  }

  // 6. Quick 4-digit numeric PIN sweep (fast: 10,000 attempts x 3 ciphers)
  onStatus("Trying 4-digit numeric PINs...");
  for (const name of ["AES", "DES", "TripleDES"]) {
    const cipher = CIPHERS[name];
    for (let i = 0; i < 10000; i++) {
      const pin = String(i).padStart(4, "0");
      try {
        const text = cipher.decrypt(trimmed, pin).toString(CryptoJS.enc.Utf8);
        if (looksLikeValidPlaintext(text)) {
          return { success: true, technique: `Weak numeric PIN (${name}, key: "${pin}")`, result: text };
        }
      } catch {
        /* expected */
      }
    }
  }

  return {
    success: false,
    message:
      "Couldn't crack this automatically. It may be strongly encrypted (real AES/DES with a proper random key has no shortcut), use a technique this tool doesn't check for, or need a longer manual brute-force search below.",
  };
}
