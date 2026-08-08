import { useState } from "react";
import CryptoJS from "crypto-js";
import bcrypt from "bcryptjs";
import { scrypt } from "scrypt-js";
import ToolLayout, { OutputBox } from "../components/ToolLayout";

const HASHES = {
  MD5: CryptoJS.MD5,
  SHA1: CryptoJS.SHA1,
  SHA256: CryptoJS.SHA256,
  SHA512: CryptoJS.SHA512,
  "SHA3-256": (msg) => CryptoJS.SHA3(msg, { outputLength: 256 }),
  RIPEMD160: CryptoJS.RIPEMD160,
};

export default function TextHash() {
  const [algorithm, setAlgorithm] = useState("SHA256");
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");

  const [pwText, setPwText] = useState("");
  const [pwAlgo, setPwAlgo] = useState("bcrypt");
  const [rounds, setRounds] = useState(10);
  const [pwOutput, setPwOutput] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState("");

  const handleHash = () => {
    const fn = HASHES[algorithm];
    const digest = fn(text).toString(CryptoJS.enc.Hex);
    setOutput(digest);
  };

  const handlePasswordHash = async () => {
    setPwError("");
    setPwOutput("");
    if (!pwText) return setPwError("Enter a password/text first.");
    setPwBusy(true);
    try {
      if (pwAlgo === "bcrypt") {
        const salt = bcrypt.genSaltSync(rounds);
        const hash = bcrypt.hashSync(pwText, salt);
        setPwOutput(hash);
      } else {
        // scrypt-js: (password, salt, N, r, p, dkLen)
        const encoder = new TextEncoder();
        const passwordBytes = encoder.encode(pwText);
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const N = 16384, r = 8, p = 1, dkLen = 32;
        const derived = await scrypt(passwordBytes, salt, N, r, p, dkLen);
        const hex = Array.from(derived).map((b) => b.toString(16).padStart(2, "0")).join("");
        const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");
        setPwOutput(`scrypt$N=${N}$r=${r}$p=${p}$salt=${saltHex}$hash=${hex}`);
      }
    } catch (e) {
      setPwError("Hashing failed: " + e.message);
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="space-y-10">
      <ToolLayout
        title="Text Hashing"
        description="Fast, deterministic digests for integrity checks. Not for passwords — see the section below for that."
        config={
          <div>
            <label className="text-xs text-slate-400 block mb-1">Algorithm</label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              className="w-full bg-black/40 border border-slate-700 rounded-md px-3 py-2 text-sm sm:w-64"
            >
              {Object.keys(HASHES).map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        }
        input={
          <div className="space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Enter text to hash..."
              className="w-full bg-black/40 border border-slate-700 rounded-md px-3 py-2 text-sm font-mono"
            />
            <button
              onClick={handleHash}
              className="px-4 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-sm font-medium"
            >
              Hash
            </button>
          </div>
        }
        output={<OutputBox value={output} showQrButton />}
      />

      <div className="max-w-3xl mx-auto">
        <div className="border-t border-slate-800 pt-6">
          <h2 className="text-lg font-bold text-cyan-400 mb-1">Password Hashing (bcrypt / scrypt)</h2>
          <p className="text-slate-400 text-sm mb-4">
            Deliberately slow, salted algorithms built for storing passwords — not for
            general file/text checksums. Each hash uses a fresh random salt.
          </p>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Algorithm</label>
                <select
                  value={pwAlgo}
                  onChange={(e) => setPwAlgo(e.target.value)}
                  className="w-full bg-black/40 border border-slate-700 rounded-md px-3 py-2 text-sm"
                >
                  <option value="bcrypt">bcrypt</option>
                  <option value="scrypt">scrypt</option>
                </select>
              </div>
              {pwAlgo === "bcrypt" && (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Salt rounds (cost factor)</label>
                  <input
                    type="number"
                    min={4}
                    max={14}
                    value={rounds}
                    onChange={(e) => setRounds(Number(e.target.value))}
                    className="w-full bg-black/40 border border-slate-700 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>

            <textarea
              value={pwText}
              onChange={(e) => setPwText(e.target.value)}
              rows={2}
              placeholder="Enter password/text to hash..."
              className="w-full bg-black/40 border border-slate-700 rounded-md px-3 py-2 text-sm font-mono"
            />
            <button
              onClick={handlePasswordHash}
              disabled={pwBusy}
              className="px-4 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-sm font-medium disabled:opacity-50"
            >
              {pwBusy ? "Hashing..." : "Hash"}
            </button>
            {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
            <OutputBox value={pwOutput} placeholder="Password hash will appear here..." showQrButton />
          </div>
        </div>
      </div>
    </div>
  );
}
