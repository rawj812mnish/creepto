// Lightweight file safety scanner used after a file is decrypted.
// Checks the real file signature (magic bytes) against the claimed
// extension, and flags dangerous/executable extensions outright.

const SIGNATURES = [
  { ext: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: "jpg", bytes: [0xff, 0xd8, 0xff] },
  { ext: "jpeg", bytes: [0xff, 0xd8, 0xff] },
  { ext: "gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { ext: "pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  { ext: "zip", bytes: [0x50, 0x4b, 0x03, 0x04] },
  { ext: "docx", bytes: [0x50, 0x4b, 0x03, 0x04] }, // docx/xlsx/pptx are zip containers
];

const DANGEROUS_EXTENSIONS = [
  "exe", "bat", "cmd", "com", "scr", "vbs", "js", "jar", "msi", "ps1", "sh",
];

function bytesMatch(bytes, signature) {
  return signature.every((b, i) => bytes[i] === b);
}

function getExtension(filename) {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function scanDecryptedFile(filename, uint8Array) {
  const warnings = [];
  const ext = getExtension(filename);

  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    warnings.push(`File has a potentially dangerous executable extension ".${ext}".`);
  }

  // double-extension check, e.g. invoice.pdf.exe
  const nameParts = filename.toLowerCase().split(".");
  if (nameParts.length > 2) {
    const last = nameParts[nameParts.length - 1];
    if (DANGEROUS_EXTENSIONS.includes(last)) {
      warnings.push(
        `File name has a double extension ending in ".${last}" — a common disguise trick.`
      );
    }
  }

  const matchingSig = SIGNATURES.find((s) => s.ext === ext);
  if (matchingSig) {
    const header = Array.from(uint8Array.slice(0, matchingSig.bytes.length));
    if (!bytesMatch(header, matchingSig.bytes)) {
      warnings.push(
        `File claims to be a ".${ext}" but its content signature doesn't match — it may be corrupted or disguised.`
      );
    }
  }

  return warnings;
}
