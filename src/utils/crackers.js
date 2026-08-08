import CryptoJS from "crypto-js";
import { chiSquaredScore, indexOfCoincidence, xorCandidateScore, ENGLISH_FREQ } from "./englishStats.js";

/* ---------------- Caesar / ROT-N ---------------- */

function caesarShift(text, shift) {
  return text.replace(/[a-zA-Z]/g, (ch) => {
    const base = ch <= "Z" ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + shift) % 26 + 26) % 26 + base);
  });
}

export function caesarCrack(ciphertext) {
  const candidates = [];
  for (let shift = 0; shift < 26; shift++) {
    const plain = caesarShift(ciphertext, shift);
    candidates.push({ shift, plain, score: chiSquaredScore(plain) });
  }
  candidates.sort((a, b) => a.score - b.score);
  return candidates;
}

/* ---------------- Repeating-key XOR ---------------- */

function xorBytesWithByte(bytes, keyByte) {
  return bytes.map((b) => b ^ keyByte);
}

function bytesToText(bytes) {
  return String.fromCharCode(...bytes);
}

function crackSingleByteXor(bytes) {
  let best = { keyByte: 0, score: Infinity };
  for (let k = 0; k < 256; k++) {
    const decoded = bytesToText(xorBytesWithByte(bytes, k));
    const score = xorCandidateScore(decoded);
    if (score < best.score) best = { keyByte: k, score };
  }
  return best.keyByte;
}

export function guessXorKeyLength(bytes, maxLen = 20) {
  const scores = [];
  for (let len = 1; len <= Math.min(maxLen, Math.floor(bytes.length / 2)); len++) {
    const groups = Array.from({ length: len }, () => []);
    bytes.forEach((b, i) => groups[i % len].push(b));
    const avgIc =
      groups.reduce((sum, g) => sum + indexOfCoincidence(bytesToText(g)), 0) / groups.length;
    scores.push({ len, avgIc });
  }
  scores.sort((a, b) => b.avgIc - a.avgIc);
  return scores;
}

/** Full repeating-key XOR crack: tries every key length up to maxKeyLen, scores
 *  each candidate's full decoded plaintext. A small penalty proportional to key
 *  length counteracts overfitting — with very few samples per byte position,
 *  a longer/wrong key length can occasionally "fit noise" and score better
 *  than the true (usually shorter) key, the same way an overly complex model
 *  overfits a small dataset. The penalty makes the crack prefer the simplest
 *  explanation that fits the data, which is what actually happens to be true
 *  the vast majority of the time for real repeating-key XOR. */
export function xorCrack(bytes, maxKeyLen = 20) {
  const cap = Math.min(maxKeyLen, Math.floor(bytes.length / 2) || 1);
  const results = [];
  for (let len = 1; len <= cap; len++) {
    const groups = Array.from({ length: len }, () => []);
    bytes.forEach((b, i) => groups[i % len].push(b));
    const keyBytes = groups.map((g) => crackSingleByteXor(g));
    const key = bytesToText(keyBytes);
    const decoded = bytesToText(bytes.map((b, i) => b ^ keyBytes[i % len]));
    const rawScore = xorCandidateScore(decoded);
    results.push({ keyLength: len, key, keyBytes, plaintext: decoded, score: rawScore + len * 2 });
  }
  results.sort((a, b) => a.score - b.score);
  return results;
}

/* ---------------- Vigenere ---------------- */

function vigenereDecodeWithKey(text, key) {
  let ki = 0;
  return text.replace(/[a-zA-Z]/g, (ch) => {
    const base = ch <= "Z" ? 65 : 97;
    const keyChar = key[ki % key.length].toUpperCase();
    const shift = keyChar.charCodeAt(0) - 65;
    ki++;
    return String.fromCharCode(((ch.charCodeAt(0) - base - shift) % 26 + 26) % 26 + base);
  });
}

export function vigenereCrack(ciphertext, maxKeyLen = 20) {
  const lettersOnly = ciphertext.replace(/[^a-zA-Z]/g, "");
  const cap = Math.min(maxKeyLen, Math.floor(lettersOnly.length / 2) || 1);
  const results = [];
  for (let len = 1; len <= cap; len++) {
    const groups = Array.from({ length: len }, () => "");
    let idx = 0;
    for (const ch of lettersOnly) {
      groups[idx % len] += ch;
      idx++;
    }
    const keyLetters = groups.map((group) => {
      let best = { shift: 0, score: Infinity };
      for (let shift = 0; shift < 26; shift++) {
        const decoded = caesarShift(group, -shift);
        const score = chiSquaredScore(decoded);
        if (score < best.score) best = { shift, score };
      }
      return String.fromCharCode(65 + best.shift);
    });
    const key = keyLetters.join("");
    const decoded = vigenereDecodeWithKey(ciphertext, key);
    // Small per-length-unit penalty counteracts the same overfitting effect
    // as XOR cracking — best-effort, works reliably given enough ciphertext.
    results.push({ keyLength: len, key, plaintext: decoded, score: chiSquaredScore(decoded) + len * 3 });
  }
  results.sort((a, b) => a.score - b.score);
  return results;
}

/* ---------------- Substitution cipher (frequency-assisted) ---------------- */

const ENGLISH_ORDER = Object.entries(ENGLISH_FREQ)
  .sort((a, b) => b[1] - a[1])
  .map(([letter]) => letter);

export function substitutionAnalyze(ciphertext) {
  const counts = {};
  for (const ch of ciphertext.toUpperCase()) {
    if (ch >= "A" && ch <= "Z") counts[ch] = (counts[ch] || 0) + 1;
  }
  const cipherOrder = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([letter]) => letter);

  const suggestedMapping = {};
  cipherOrder.forEach((letter, i) => {
    if (ENGLISH_ORDER[i]) suggestedMapping[letter] = ENGLISH_ORDER[i];
  });

  const decoded = ciphertext.replace(/[a-zA-Z]/g, (ch) => {
    const upper = ch.toUpperCase();
    const mapped = suggestedMapping[upper] || upper;
    return ch === upper ? mapped : mapped.toLowerCase();
  });

  // common digraphs to help manual refinement
  const digraphCounts = {};
  const upperText = ciphertext.toUpperCase().replace(/[^A-Z]/g, "");
  for (let i = 0; i < upperText.length - 1; i++) {
    const pair = upperText.slice(i, i + 2);
    digraphCounts[pair] = (digraphCounts[pair] || 0) + 1;
  }
  const topDigraphs = Object.entries(digraphCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pair, count]) => `${pair} (${count}x)`);

  return { suggestedMapping, decoded, cipherFrequencyOrder: cipherOrder, topDigraphs };
}

/* ---------------- Hash dictionary crack ---------------- */

const COMMON_PASSWORDS = [
  "password", "123456", "12345678", "qwerty", "abc123", "monkey", "letmein",
  "dragon", "111111", "baseball", "iloveyou", "trustno1", "sunshine", "master",
  "welcome", "shadow", "ashley", "football", "jesus", "michael", "ninja",
  "mustang", "password1", "123456789", "adobe123", "admin", "root", "toor",
  "test", "guest", "hello", "freedom", "whatever", "qazwsx", "hunter2",
  "superman", "batman", "starwars", "princess", "login", "passw0rd",
  "changeme", "secret", "1234", "12345", "000000", "654321", "121212",
];

const HASH_FNS = {
  MD5: CryptoJS.MD5,
  SHA1: CryptoJS.SHA1,
  SHA256: CryptoJS.SHA256,
  SHA512: CryptoJS.SHA512,
};

export function hashDictionaryCrack(targetHash, algorithm) {
  const target = targetHash.trim().toLowerCase();
  const fn = HASH_FNS[algorithm];
  if (!fn) return { found: false, tried: 0 };

  for (let i = 0; i < COMMON_PASSWORDS.length; i++) {
    const candidate = COMMON_PASSWORDS[i];
    const digest = fn(candidate).toString(CryptoJS.enc.Hex).toLowerCase();
    if (digest === target) {
      return { found: true, password: candidate, tried: i + 1 };
    }
  }
  return { found: false, tried: COMMON_PASSWORDS.length };
}
