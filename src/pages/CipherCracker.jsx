import { useState, useRef } from "react";
import ToolLayout, { OutputBox } from "../components/ToolLayout";
import { autoCrack } from "../utils/autoCrack";
import { runBruteForce, estimateKeyspaceSize } from "../utils/bruteForce";

export default function CipherCracker() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleCrack = async () => {
    setResult(null);
    setStatus("");
    setRunning(true);
    setShowAdvanced(false);
    const r = await autoCrack(input, (s) => setStatus(s));
    setResult(r);
    setStatus("");
    setRunning(false);
    if (!r.success) setShowAdvanced(true);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-cyan-400">Cipher Cracker</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Paste ciphertext or a hash. This automatically tries Caesar, XOR, Vigenère,
          hash dictionary lookup, and common weak keys — whichever fits. Real AES/GCM
          with a strong random key has no shortcut, so it won't crack that (correctly).
        </p>
      </div>

      <ToolLayout
        input={
          <div className="space-y-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={5}
              placeholder="Paste ciphertext or a hash..."
              className="w-full bg-black/40 border border-slate-700 rounded-md px-3 py-2 text-sm font-mono"
            />
            <button
              onClick={handleCrack}
              disabled={running}
              className="px-4 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-sm font-medium disabled:opacity-50"
            >
              {running ? "Cracking..." : "Crack"}
            </button>
            {status && <p className="text-xs text-slate-500">{status}</p>}
          </div>
        }
        output={
          result ? (
            result.success ? (
              <div className="space-y-2">
                <p className="text-xs text-emerald-400">Cracked via: {result.technique}</p>
                <OutputBox value={result.result} />
              </div>
            ) : (
              <p className="text-sm text-amber-400">{result.message}</p>
            )
          ) : (
            <OutputBox value="" placeholder="Result will appear here..." />
          )
        }
      />

      {showAdvanced && <AdvancedBruteForce ciphertext={input} />}
    </div>
  );
}

/** Manual fallback: full-control brute force, shown only after auto-crack fails
 *  so it doesn't clutter the default flow. */
function AdvancedBruteForce({ ciphertext }) {
  const [open, setOpen] = useState(true);
  const [algorithm, setAlgorithm] = useState("AES");
  const [keyType, setKeyType] = useState("numeric");
  const [length, setLength] = useState(4);
  const [progress, setProgress] = useState(null);
  const [found, setFound] = useState([]);
  const [running, setRunning] = useState(false);
  const controllerRef = useRef(null);

  const keyspace = estimateKeyspaceSize(keyType, length);
  const assumedKeysPerSecond = 1200;
  const estimatedSeconds = keyspace / assumedKeysPerSecond;
  const estimatedLabel =
    estimatedSeconds < 60
      ? `~${Math.ceil(estimatedSeconds)}s worst case`
      : estimatedSeconds < 3600
      ? `~${Math.ceil(estimatedSeconds / 60)} min worst case`
      : `~${(estimatedSeconds / 3600).toFixed(1)} hrs worst case — not recommended`;

  const handleStart = () => {
    if (!ciphertext) return;
    setFound([]);
    setRunning(true);
    controllerRef.current = runBruteForce({
      ciphertext,
      algorithm,
      keyType,
      length,
      onProgress: (tried, total) => setProgress({ tried, total }),
      onFound: (candidate) => setFound((f) => [...f, candidate]),
      onDone: () => setRunning(false),
    });
  };

  const handleStop = () => {
    controllerRef.current?.cancel();
    setRunning(false);
  };

  return (
    <div className="border-t border-slate-800 pt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm text-cyan-400 hover:text-cyan-300"
      >
        {open ? "▾" : "▸"} Advanced: manual brute force (didn't auto-crack? try a wider search)
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Algorithm used to encrypt</label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="w-full bg-black/40 border border-slate-700 rounded-md px-3 py-2 text-sm"
              >
                {["AES", "DES", "TripleDES", "RC4", "Rabbit"].map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Key Type</label>
              <select
                value={keyType}
                onChange={(e) => setKeyType(e.target.value)}
                className="w-full bg-black/40 border border-slate-700 rounded-md px-3 py-2 text-sm"
              >
                <option value="numeric">Numeric PIN (0-9)</option>
                <option value="alphanumeric">Alphanumeric (a-z, A-Z, 0-9)</option>
                <option value="full">Full charset (a-z, A-Z, 0-9, symbols)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Key Length: {length} {keyType === "numeric" ? "digits" : "characters"}
              </label>
              <input
                type="range"
                min={2}
                max={keyType === "numeric" ? 8 : keyType === "alphanumeric" ? 5 : 4}
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex items-end">
              <p className="text-xs text-slate-500">
                Keyspace: {keyspace.toLocaleString()} — {estimatedLabel}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            {!running ? (
              <button onClick={handleStart} className="px-4 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-sm font-medium">
                Start Brute Force
              </button>
            ) : (
              <button onClick={handleStop} className="px-4 py-2 rounded-md bg-red-800 hover:bg-red-700 text-sm font-medium">
                Stop
              </button>
            )}
          </div>
          {progress && (
            <p className="text-xs text-slate-500">
              Tried {progress.tried.toLocaleString()} / {progress.total.toLocaleString()} keys
              {" "}({((progress.tried / progress.total) * 100).toFixed(1)}%)
            </p>
          )}
          <OutputBox
            value={found.map((f) => `Key: ${f.key}\n${f.plaintext}`).join("\n\n")}
            placeholder="Matches will appear here as they're found..."
          />
        </div>
      )}
    </div>
  );
}
