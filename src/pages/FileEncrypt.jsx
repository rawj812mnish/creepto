import { useState, useRef } from "react";
import CryptoJS from "crypto-js";
import ToolLayout, { WarningBanner } from "../components/ToolLayout";
import {
  arrayBufferToWordArray,
  wordArrayToUint8Array,
  readFileAsArrayBuffer,
  readFileAsText,
  downloadBytes,
} from "../utils/binaryUtils";
import { scanDecryptedFile } from "../utils/fileSafety";

const CIPHERS = {
  AES: { fn: CryptoJS.AES, hasMode: true, insecure: false },
  DES: { fn: CryptoJS.DES, hasMode: true, insecure: true },
  TripleDES: { fn: CryptoJS.TripleDES, hasMode: true, insecure: false },
  RC4: { fn: CryptoJS.RC4, hasMode: false, insecure: true },
  Rabbit: { fn: CryptoJS.Rabbit, hasMode: false, insecure: false },
};

const MODES = {
  CBC: CryptoJS.mode.CBC,
  ECB: CryptoJS.mode.ECB,
  CTR: CryptoJS.mode.CTR,
  CFB: CryptoJS.mode.CFB,
  OFB: CryptoJS.mode.OFB,
};

export default function FileEncrypt() {
  const [algorithm, setAlgorithm] = useState("AES");
  const [modeName, setModeName] = useState("CBC");
  const [key, setKey] = useState("");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const fileInputRef = useRef(null);

  const cipher = CIPHERS[algorithm];
  const buildCfg = () =>
    cipher.hasMode ? { mode: MODES[modeName], padding: CryptoJS.pad.Pkcs7 } : {};

  const handleEncrypt = async () => {
    setError("");
    setWarning("");
    setStatus("");
    if (!file) return setError("Choose a file first.");
    if (!key) return setError("Enter a key/passphrase first.");

    try {
      setStatus("Reading file...");
      const buffer = await readFileAsArrayBuffer(file);
      const wordArray = arrayBufferToWordArray(buffer);

      setStatus("Encrypting...");
      const encrypted = cipher.fn.encrypt(wordArray, key, buildCfg());
      const base64Output = encrypted.toString(); // OpenSSL-compatible, salt embedded

      downloadBytes(base64Output, `${file.name}.enc`, "text/plain");
      setStatus(`Done — downloaded "${file.name}.enc"`);
    } catch (e) {
      setError("Encryption failed: " + e.message);
    }
  };

  const handleDecrypt = async () => {
    setError("");
    setWarning("");
    setStatus("");
    if (!file) return setError("Choose a .enc file first.");
    if (!key) return setError("Enter a key/passphrase first.");

    try {
      setStatus("Reading file...");
      const base64Text = await readFileAsText(file);

      setStatus("Decrypting...");
      const decryptedWordArray = cipher.fn.decrypt(base64Text, key, buildCfg());
      const bytes = wordArrayToUint8Array(decryptedWordArray);

      if (bytes.length === 0) {
        setError("Decryption failed — wrong key, wrong algorithm/mode, or corrupted file.");
        setStatus("");
        return;
      }

      const outputName = file.name.endsWith(".enc")
        ? file.name.slice(0, -4)
        : `decrypted_${file.name}`;

      const foundWarnings = scanDecryptedFile(outputName, bytes);
      if (foundWarnings.length > 0) {
        setWarning("⚠️ File safety check flagged this decrypted file:\n" + foundWarnings.join("\n"));
      }

      downloadBytes(bytes, outputName);
      setStatus(`Done — downloaded "${outputName}"`);
    } catch (e) {
      setError("Decryption failed — wrong key, wrong algorithm/mode, or corrupted file.");
      setStatus("");
    }
  };

  return (
    <ToolLayout
      title="File Encryption / Decryption"
      description="Any file type — image, PDF, DOCX, ZIP, etc. Treated as raw bytes, encrypted as a whole. Runs entirely in your browser."
      config={
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Algorithm</label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              className="w-full bg-black/40 border border-slate-700 rounded-md px-3 py-2 text-sm"
            >
              {Object.entries(CIPHERS).map(([name, c]) => (
                <option key={name} value={name}>
                  {name} {c.insecure ? "— insecure (legacy)" : ""}
                </option>
              ))}
            </select>
          </div>
          {cipher.hasMode && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Mode</label>
              <select
                value={modeName}
                onChange={(e) => setModeName(e.target.value)}
                className="w-full bg-black/40 border border-slate-700 rounded-md px-3 py-2 text-sm"
              >
                {Object.keys(MODES).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400 block mb-1">Key / Passphrase</label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full bg-black/40 border border-slate-700 rounded-md px-3 py-2 text-sm"
              placeholder="Enter secret key..."
            />
          </div>
        </div>
      }
      input={
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => setFile(e.target.files[0] || null)}
            className="w-full text-sm text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-slate-700 file:text-slate-100 file:text-sm"
          />
          {file && <p className="text-xs text-slate-500">Selected: {file.name} ({file.size} bytes)</p>}
          <div className="flex gap-3">
            <button
              onClick={handleEncrypt}
              className="px-4 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-sm font-medium"
            >
              Encrypt & Download
            </button>
            <button
              onClick={handleDecrypt}
              className="px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-sm font-medium"
            >
              Decrypt & Download
            </button>
          </div>
          {status && <p className="text-emerald-400 text-sm">{status}</p>}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <p className="text-xs text-slate-600">
            Encrypting produces a downloadable "&lt;filename&gt;.enc" file. Decrypting a
            ".enc" file restores the exact original bytes and downloads it under its
            original name.
          </p>
        </div>
      }
      warning={<WarningBanner message={warning} />}
    />
  );
}
