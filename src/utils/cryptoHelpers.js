import CryptoJS from "crypto-js";

/** Parse a key or IV string given its declared format into a CryptoJS WordArray. */
export function parseToWordArray(value, format) {
  if (!value) return null;
  switch (format) {
    case "Base64":
      return CryptoJS.enc.Base64.parse(value);
    case "Hex":
      return CryptoJS.enc.Hex.parse(value);
    default:
      return CryptoJS.enc.Utf8.parse(value);
  }
}

/** Generate a random key/IV of the given byte length, returned in the requested format. */
export function generateRandom(byteLength, format) {
  const wordArray = CryptoJS.lib.WordArray.random(byteLength);
  if (format === "Base64") return CryptoJS.enc.Base64.stringify(wordArray);
  if (format === "Hex") return CryptoJS.enc.Hex.stringify(wordArray);
  // Plain text: fall back to hex since raw random bytes aren't valid UTF-8 text
  return CryptoJS.enc.Hex.stringify(wordArray);
}

export const PADDINGS = {
  PKCS5Padding: CryptoJS.pad.Pkcs7,
  NoPadding: CryptoJS.pad.NoPadding,
  ZeroPadding: CryptoJS.pad.ZeroPadding,
  ISO10126Padding: CryptoJS.pad.Iso10126,
  ANSIX923Padding: CryptoJS.pad.AnsiX923,
  ISO97971Padding: CryptoJS.pad.Iso97971,
};

export const CBC_LIKE_MODES = {
  CBC: CryptoJS.mode.CBC,
  ECB: CryptoJS.mode.ECB,
  CTR: CryptoJS.mode.CTR,
  CFB: CryptoJS.mode.CFB,
  OFB: CryptoJS.mode.OFB,
};

export const KEY_SIZES_BITS = [128, 192, 256];

/** Derive a fixed-length key from a passphrase deterministically (no salt), for raw-key/explicit-IV mode. */
export function deriveKeyFromPassphrase(passphrase, keySizeBits) {
  const keySizeWords = keySizeBits / 32;
  const emptySalt = CryptoJS.lib.WordArray.create([], 0);
  return CryptoJS.EvpKDF(passphrase, emptySalt, { keySize: keySizeWords });
}
