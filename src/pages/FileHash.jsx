import { useState } from "react";
import CryptoJS from "crypto-js";
import ToolLayout, { OutputBox } from "../components/ToolLayout";
import { arrayBufferToWordArray, readFileAsArrayBuffer } from "../utils/binaryUtils";

const HASHES = {
  MD5: CryptoJS.MD5,
  SHA1: CryptoJS.SHA1,
  SHA256: CryptoJS.SHA256,
  SHA512: CryptoJS.SHA512,
};

export default function FileHash() {
  const [algorithm, setAlgorithm] = useState("SHA256");
  const [file, setFile] = useState(null);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleHash = async () => {
    setError("");
    setOutput("");
    if (!file) return setError("Choose a file first.");
    setBusy(true);
    try {
      const buffer = await readFileAsArrayBuffer(file);
      const wordArray = arrayBufferToWordArray(buffer);
      const digest = HASHES[algorithm](wordArray).toString(CryptoJS.enc.Hex);
      setOutput(digest);
    } catch (e) {
      setError("Hashing failed: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolLayout
      title="File Hashing"
      description="Compute a checksum of any file to verify integrity. Runs entirely in your browser."
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
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0] || null)}
            className="w-full text-sm text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-slate-700 file:text-slate-100 file:text-sm"
          />
          {file && <p className="text-xs text-slate-500">Selected: {file.name} ({file.size} bytes)</p>}
          <button
            onClick={handleHash}
            disabled={busy}
            className="px-4 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Hashing..." : "Hash File"}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      }
      output={<OutputBox value={output} showQrButton />}
    />
  );
}
