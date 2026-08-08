import CryptoJS from "crypto-js";

/** Convert a browser ArrayBuffer into a CryptoJS WordArray. */
export function arrayBufferToWordArray(ab) {
  const bytes = new Uint8Array(ab);
  const words = [];
  for (let i = 0; i < bytes.length; i += 4) {
    words.push(
      (bytes[i] << 24) |
        ((bytes[i + 1] || 0) << 16) |
        ((bytes[i + 2] || 0) << 8) |
        (bytes[i + 3] || 0)
    );
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

/** Convert a CryptoJS WordArray back into a Uint8Array of exact original bytes. */
export function wordArrayToUint8Array(wordArray) {
  const { words, sigBytes } = wordArray;
  const bytes = new Uint8Array(sigBytes);
  for (let i = 0; i < sigBytes; i++) {
    bytes[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return bytes;
}

/** Read a File/Blob into an ArrayBuffer (Promise-based). */
export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/** Read a File/Blob as text (Promise-based) — used for reading .enc files back. */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/** Trigger a browser download of a Uint8Array/Blob/string as a file. */
export function downloadBytes(data, filename, mimeType = "application/octet-stream") {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
