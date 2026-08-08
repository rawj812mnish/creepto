import { useState } from "react";
import ToolLayout, { OutputBox } from "../components/ToolLayout";

const CHARSETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

function estimateCrackTime(entropyBits) {
  // assume 10 billion guesses/sec (fast offline attack)
  const guessesPerSecond = 1e10;
  const seconds = Math.pow(2, entropyBits) / guessesPerSecond;
  if (seconds < 1) return "instantly";
  const units = [
    ["years", 31536000],
    ["days", 86400],
    ["hours", 3600],
    ["minutes", 60],
    ["seconds", 1],
  ];
  for (const [name, secs] of units) {
    if (seconds >= secs) {
      const value = seconds / secs;
      return value > 1e6 ? `${value.toExponential(2)} ${name}` : `${Math.round(value)} ${name}`;
    }
  }
  return "instantly";
}

export default function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({
    lowercase: true,
    uppercase: true,
    numbers: true,
    symbols: true,
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const toggle = (key) => setOptions((o) => ({ ...o, [key]: !o[key] }));

  const handleGenerate = () => {
    setError("");
    const pool = Object.entries(options)
      .filter(([, enabled]) => enabled)
      .map(([key]) => CHARSETS[key])
      .join("");

    if (!pool) {
      setError("Select at least one character set.");
      return;
    }

    const bytes = new Uint32Array(length);
    crypto.getRandomValues(bytes);
    const result = Array.from(bytes, (n) => pool[n % pool.length]).join("");
    setPassword(result);
  };

  const poolSize = Object.entries(options)
    .filter(([, enabled]) => enabled)
    .reduce((sum, [key]) => sum + CHARSETS[key].length, 0);
  const entropyBits = poolSize > 0 ? Math.log2(poolSize) * length : 0;

  return (
    <ToolLayout
      title="Password Generator"
      description="Cryptographically random passwords generated locally using the browser's crypto API."
      config={
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Length: {length}</label>
            <input
              type="range"
              min={6}
              max={64}
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(CHARSETS).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={() => toggle(key)}
                  className="accent-cyan-600"
                />
                {key}
              </label>
            ))}
          </div>
        </div>
      }
      input={
        <div className="space-y-3">
          <button
            onClick={handleGenerate}
            className="px-4 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-sm font-medium"
          >
            Generate Password
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {password && (
            <p className="text-xs text-slate-400">
              Entropy: ~{entropyBits.toFixed(1)} bits — estimated offline crack time:{" "}
              <span className="text-emerald-400">{estimateCrackTime(entropyBits)}</span>
            </p>
          )}
        </div>
      }
      output={<OutputBox value={password} />}
    />
  );
}
