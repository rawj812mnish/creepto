import { useState } from "react";
import ToolLayout, { OutputBox } from "../components/ToolLayout";

function isValidBase64(s) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(s)) return false;
  return s.length % 4 === 0;
}

function isValidHex(s) {
  return /^[a-fA-F0-9]+$/.test(s) && s.length % 2 === 0;
}

function base64ByteLength(s) {
  const padding = (s.match(/=+$/) || [""])[0].length;
  return (s.length / 4) * 3 - padding;
}

function analyze(input) {
  const s = input.trim();
  if (!s) return [];

  const notes = [];

  if (s.startsWith("U2FsdGVkX1")) {
    notes.push(
      'Starts with "U2FsdGVkX1" — this is Base64 for "Salted__", the CryptoJS/OpenSSL passphrase-based header. Almost certainly AES (or another block cipher) encrypted with a plain-text passphrase, salt embedded.'
    );
  }

  const base64 = isValidBase64(s);
  const hex = isValidHex(s);

  if (base64) {
    const byteLen = base64ByteLength(s);
    notes.push(`Valid Base64. Decodes to ${byteLen} raw bytes.`);
    if (byteLen % 16 === 0) {
      notes.push("Byte length is a multiple of 16 — consistent with an AES block cipher (128-bit blocks).");
    } else if (byteLen % 8 === 0) {
      notes.push("Byte length is a multiple of 8 — consistent with DES/TripleDES (64-bit blocks), or could be an unpadded/stream cipher output.");
    } else {
      notes.push("Byte length isn't block-aligned — likely a stream cipher (RC4, Rabbit, ChaCha20) or GCM mode output (which isn't padded to a block size).");
    }
  }

  if (hex && !base64) {
    const byteLen = s.length / 2;
    notes.push(`Valid hex string, ${byteLen} bytes.`);
    if (byteLen % 16 === 0) notes.push("Multiple of 16 bytes — consistent with AES.");
    else if (byteLen % 8 === 0) notes.push("Multiple of 8 bytes — consistent with DES/TripleDES.");
  }

  if (!base64 && !hex) {
    notes.push("Doesn't look like valid Base64 or hex — may be plaintext, a custom encoding, or corrupted ciphertext.");
  }

  if (notes.length === 0) {
    notes.push("No strong signals found — format is ambiguous from the text alone.");
  }

  return notes;
}

export default function EncryptedTextIdentifier() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [checked, setChecked] = useState(false);

  const handleIdentify = () => {
    setResults(analyze(input));
    setChecked(true);
  };

  return (
    <ToolLayout
      title="Encrypted Text Identifier"
      description="Best-effort guesses about ciphertext format and likely cipher family, based on structure alone — not a guarantee, since ciphertext is designed to look random."
      input={
        <div className="space-y-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            placeholder="Paste ciphertext (Base64 or Hex)..."
            className="w-full bg-black/40 border border-slate-700 rounded-md px-3 py-2 text-sm font-mono"
          />
          <button
            onClick={handleIdentify}
            className="px-4 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-sm font-medium"
          >
            Identify
          </button>
        </div>
      }
      output={
        <OutputBox
          value={checked ? results.join("\n\n") : ""}
          placeholder="Analysis will appear here..."
        />
      }
    />
  );
}
