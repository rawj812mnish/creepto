import { useState } from "react";
import CryptoJS from "crypto-js";
import ToolLayout, { OutputBox, WarningBanner } from "../components/ToolLayout";
import InfoTooltip from "../components/InfoTooltip";
import { scanTextForSuspiciousUrls } from "../utils/urlScanner";
import {
  parseToWordArray,
  generateRandom,
  PADDINGS,
  CBC_LIKE_MODES,
  KEY_SIZES_BITS,
  deriveKeyFromPassphrase,
} from "../utils/cryptoHelpers";
import { aesGcmEncrypt, aesGcmDecrypt } from "../utils/aesGcm";

const CIPHERS = {
  AES: { fn: CryptoJS.AES, insecure: false, ivBytes: 16 },
  DES: { fn: CryptoJS.DES, insecure: true, ivBytes: 8 },
  TripleDES: { fn: CryptoJS.TripleDES, insecure: false, ivBytes: 8 },
  RC4: { fn: CryptoJS.RC4, insecure: true, stream: true },
  Rabbit: { fn: CryptoJS.Rabbit, insecure: false, stream: true },
};

const FORMATS = ["Plain Text", "Base64", "Hex"];

function FormatToggle({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {FORMATS.map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => onChange(f)}
          className={`text-xs px-2 py-1 rounded-full border ${
            value === f
              ? "bg-cyan-700 border-cyan-600 text-white"
              : "bg-transparent border-slate-700 text-slate-400 hover:border-slate-500"
          }`}
        >
          {f}
        </button>
      ))}
    </div>
  );
}

export default function TextEncrypt() {
  const [algorithm, setAlgorithm] = useState("AES");
  const [mode, setMode] = useState("CBC");
  const [padding, setPadding] = useState("PKCS5Padding");
  const [keySizeBits, setKeySizeBits] = useState(256);

  const [key, setKey] = useState("");
  const [keyFormat, setKeyFormat] = useState("Plain Text");
  const [iv, setIv] = useState("");
  const [ivFormat, setIvFormat] = useState("Plain Text");

  const [outputFormat, setOutputFormat] = useState("Base64");
  const [inputText, setInputText] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [busy, setBusy] = useState(false);

  const cipher = CIPHERS[algorithm];
  const isGcm = algorithm === "AES" && mode === "GCM";
  const modeNeedsIv = mode !== "ECB" && !cipher.stream;

  const handleGenerateKey = () => {
    const bytes = algorithm === "AES" ? keySizeBits / 8 : algorithm === "TripleDES" ? 24 : 8;
    setKey(generateRandom(bytes, keyFormat));
  };

  const handleGenerateIv = () => {
    setIv(generateRandom(cipher.ivBytes || 16, ivFormat));
  };

  const buildCfg = () => ({
    mode: CBC_LIKE_MODES[mode],
    padding: PADDINGS[padding],
  });

  // Raw-key mode is used whenever the key format isn't Plain Text, OR an
  // explicit IV was provided. Otherwise we use CryptoJS's passphrase mode
  // (auto salt + IV derivation, OpenSSL-compatible "Salted__" output).
  const usingRawKeyMode = keyFormat !== "Plain Text" || !!iv;

  const resolveKeyWordArray = () => {
    if (keyFormat === "Plain Text") {
      return deriveKeyFromPassphrase(
        key,
        algorithm === "AES" ? keySizeBits : algorithm === "TripleDES" ? 192 : 64
      );
    }
    return parseToWordArray(key, keyFormat);
  };

  const handleEncrypt = async () => {
    setError("");
    setWarning("");
    if (!key) return setError("Enter a key first.");

    try {
      setBusy(true);

      if (isGcm) {
        const result = await aesGcmEncrypt(inputText, key, keySizeBits);
        setOutput(result);
        return;
      }

      const cfg = buildCfg();
      let result;

      if (usingRawKeyMode) {
        const keyWA = resolveKeyWordArray();
        if (modeNeedsIv && !iv) {
          throw new Error(`Mode ${mode} requires an IV when using a non-plain-text key.`);
        }
        const ivWA = modeNeedsIv ? parseToWordArray(iv, ivFormat) : undefined;
        const encrypted = cipher.fn.encrypt(inputText, keyWA, { ...cfg, iv: ivWA });
        result =
          outputFormat === "Hex"
            ? encrypted.ciphertext.toString(CryptoJS.enc.Hex)
            : encrypted.ciphertext.toString(CryptoJS.enc.Base64);
      } else {
        const encrypted = cipher.fn.encrypt(inputText, key, cfg);
        result =
          outputFormat === "Hex"
            ? encrypted.ciphertext.toString(CryptoJS.enc.Hex)
            : encrypted.toString();
      }
      setOutput(result);
    } catch (e) {
      setError("Encryption failed: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDecrypt = async () => {
    setError("");
    setWarning("");
    if (!key) return setError("Enter a key first.");

    try {
      setBusy(true);
      let plainText;

      if (isGcm) {
        plainText = await aesGcmDecrypt(inputText, key, keySizeBits);
      } else {
        const cfg = buildCfg();

        if (usingRawKeyMode) {
          const keyWA = resolveKeyWordArray();
          if (modeNeedsIv && !iv) {
            throw new Error(`Mode ${mode} requires an IV when using a non-plain-text key.`);
          }
          const ivWA = modeNeedsIv ? parseToWordArray(iv, ivFormat) : undefined;
          const ciphertextWA =
            outputFormat === "Hex"
              ? CryptoJS.enc.Hex.parse(inputText)
              : CryptoJS.enc.Base64.parse(inputText);
          const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: ciphertextWA });
          const decrypted = cipher.fn.decrypt(cipherParams, keyWA, { ...cfg, iv: ivWA });
          plainText = decrypted.toString(CryptoJS.enc.Utf8);
        } else {
          let cipherInput = inputText;
          if (outputFormat === "Hex") {
            const ciphertext = CryptoJS.enc.Hex.parse(inputText);
            cipherInput = CryptoJS.lib.CipherParams.create({ ciphertext });
          }
          const decrypted = cipher.fn.decrypt(cipherInput, key, cfg);
          plainText = decrypted.toString(CryptoJS.enc.Utf8);
        }
      }

      if (!plainText) {
        setError("Decryption failed — wrong key, wrong algorithm/mode, or corrupted input.");
        return;
      }
      setOutput(plainText);

      const suspicious = scanTextForSuspiciousUrls(plainText);
      if (suspicious.length > 0) {
        const lines = suspicious.map((s) => `${s.url} — ${s.flags.join(", ")}`).join("\n");
        setWarning(`⚠️ This decrypted message contains potentially suspicious link(s):\n${lines}`);
      }
    } catch (e) {
      setError("Decryption failed — wrong key, wrong algorithm/mode, or corrupted input.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolLayout
      title="Text Encryption / Decryption"
      description="Runs entirely in your browser. Nothing is sent to a server."
      config={
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Algorithm</label>
              <select
                value={algorithm}
                onChange={(e) => {
                  setAlgorithm(e.target.value);
                  if (e.target.value !== "AES" && mode === "GCM") setMode("CBC");
                }}
                className="w-full bg-black/40 border border-slate-700 rounded-md px-3 py-2 text-sm"
              >
                {Object.entries(CIPHERS).map(([name, c]) => (
                  <option key={name} value={name}>
                    {name} {c.insecure ? "— insecure (legacy)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {algorithm === "AES" && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Key Size (bits)</label>
                <select
                  value={keySizeBits}
                  onChange={(e) => setKeySizeBits(Number(e.target.value))}
                  className="w-full bg-black/40 border border-slate-700 rounded-md px-3 py-2 text-sm"
                >
                  {KEY_SIZES_BITS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!cipher.stream && (
              <div>
                <label className="text-xs text-slate-400 mb-1 flex items-center">
                  Cipher Mode
                  <InfoTooltip text="How the cipher processes blocks. CBC chains blocks together (most common, needs an IV). ECB doesn't chain — insecure for anything with repeating patterns. CTR/CFB/OFB turn a block cipher into a stream cipher. GCM (AES only) also authenticates the data, detecting tampering." />
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full bg-black/40 border border-slate-700 rounded-md px-3 py-2 text-sm"
                >
                  {Object.keys(CBC_LIKE_MODES).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                  {algorithm === "AES" && <option value="GCM">GCM</option>}
                </select>
              </div>
            )}

            {!cipher.stream && !isGcm && (
              <div>
                <label className="text-xs text-slate-400 mb-1 flex items-center">
                  Padding
                  <InfoTooltip text="Block ciphers need input padded to a fixed block size. PKCS5/PKCS7 is the standard choice. NoPadding requires your input to already be an exact multiple of the block size." />
                </label>
                <select
                  value={padding}
                  onChange={(e) => setPadding(e.target.value)}
                  className="w-full bg-black/40 border border-slate-700 rounded-md px-3 py-2 text-sm"
                >
                  {Object.keys(PADDINGS).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs text-slate-400 block mb-1">Output Text Format</label>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                className="w-full bg-black/40 border border-slate-700 rounded-md px-3 py-2 text-sm"
                disabled={isGcm}
              >
                <option value="Base64">Base64</option>
                <option value="Hex">Hex</option>
              </select>
              {isGcm && <p className="text-xs text-slate-600 mt-1">GCM output is always Base64.</p>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400 flex items-center">
                Secret Key
                <InfoTooltip text="Plain Text mode: your key is a passphrase, and the tool auto-derives the real cipher key plus a random salt each time (most convenient). Base64/Hex mode: you supply the exact raw key bytes yourself — needed if you're matching output from another tool." />
              </label>
              <button
                type="button"
                onClick={handleGenerateKey}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                Generate
              </button>
            </div>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full bg-black/40 border border-slate-700 rounded-md px-3 py-2 text-sm mb-2"
              placeholder="Enter secret key..."
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Key Format</span>
              <FormatToggle value={keyFormat} onChange={setKeyFormat} />
            </div>
          </div>

          {modeNeedsIv && !isGcm && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400 flex items-center">
                  IV (optional — required if key format isn't Plain Text)
                  <InfoTooltip text="The Initialization Vector randomizes output so encrypting the same message twice doesn't produce identical ciphertext. Auto-handled in Plain Text key mode; must be supplied explicitly for raw-key mode." />
                </label>
                <button
                  type="button"
                  onClick={handleGenerateIv}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Generate
                </button>
              </div>
              <input
                type="text"
                value={iv}
                onChange={(e) => setIv(e.target.value)}
                className="w-full bg-black/40 border border-slate-700 rounded-md px-3 py-2 text-sm mb-2"
                placeholder="Enter IV..."
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">IV Format</span>
                <FormatToggle value={ivFormat} onChange={setIvFormat} />
              </div>
            </div>
          )}

          {isGcm && (
            <p className="text-xs text-slate-600">
              GCM mode uses your browser's native crypto engine. A random 12-byte IV is
              generated automatically each time and bundled into the output, so there's
              nothing extra for you to manage here.
            </p>
          )}
        </div>
      }
      input={
        <div className="space-y-3">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={6}
            placeholder="Type plaintext to encrypt, or paste ciphertext to decrypt..."
            className="w-full bg-black/40 border border-slate-700 rounded-md px-3 py-2 text-sm font-mono"
          />
          <div className="flex gap-3">
            <button
              onClick={handleEncrypt}
              disabled={busy}
              className="px-4 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-sm font-medium disabled:opacity-50"
            >
              {busy ? "Working..." : "Encrypt"}
            </button>
            <button
              onClick={handleDecrypt}
              disabled={busy}
              className="px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-sm font-medium disabled:opacity-50"
            >
              {busy ? "Working..." : "Decrypt"}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      }
      warning={<WarningBanner message={warning} />}
      output={<OutputBox value={output} showQrButton />}
    />
  );
}
