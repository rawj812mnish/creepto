import { useState } from "react";
import ToolLayout, { OutputBox } from "../components/ToolLayout";

function identifyHash(input) {
  const s = input.trim();
  if (!s) return [];

  const results = [];

  if (/^\$2[aby]\$\d{2}\$/.test(s)) results.push("bcrypt");
  if (/^\$argon2(id|i|d)\$/.test(s)) results.push("Argon2");
  if (/^scrypt\$/.test(s)) results.push("scrypt (custom format)");
  if (/^\$6\$/.test(s)) results.push("SHA-512 crypt (Unix)");
  if (/^\$5\$/.test(s)) results.push("SHA-256 crypt (Unix)");
  if (/^\$1\$/.test(s)) results.push("MD5 crypt (Unix)");

  const isHex = /^[a-fA-F0-9]+$/.test(s);
  if (isHex) {
    const lengthMap = {
      32: ["MD5", "NTLM"],
      40: ["SHA1", "RIPEMD160"],
      56: ["SHA224", "SHA3-224"],
      64: ["SHA256", "SHA3-256", "BLAKE2s"],
      96: ["SHA384", "SHA3-384"],
      128: ["SHA512", "SHA3-512", "BLAKE2b"],
    };
    const candidates = lengthMap[s.length];
    if (candidates) results.push(...candidates.map((c) => `${c} (hex length ${s.length})`));
  }

  const isBase64ish = /^[A-Za-z0-9+/=]+$/.test(s) && !isHex;
  if (isBase64ish && results.length === 0) {
    results.push("Possibly Base64-encoded hash/ciphertext (algorithm not determinable from format alone)");
  }

  return results;
}

export default function HashIdentifier() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [checked, setChecked] = useState(false);

  const handleIdentify = () => {
    setResults(identifyHash(input));
    setChecked(true);
  };

  return (
    <ToolLayout
      title="Hash Identifier"
      description="Guesses the likely algorithm from a hash's length and format. Pattern-based only — not a guarantee."
      input={
        <div className="space-y-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            placeholder="Paste a hash string..."
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
          value={checked ? (results.length ? results.join("\n") : "No confident match found.") : ""}
          placeholder="Possible algorithm(s) will appear here..."
        />
      }
    />
  );
}
