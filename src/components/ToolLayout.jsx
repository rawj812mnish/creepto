import { useState } from "react";
import QRCode from "qrcode";

/**
 * Reusable 3-zone layout: Config (top) -> Input (middle) -> Output (bottom).
 * Every tool page renders its own config controls / input / output content
 * as children passed into the named slots below.
 */
export default function ToolLayout({ title, description, config, input, output, warning }) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-cyan-400">{title}</h1>
        {description && <p className="text-slate-400 mt-1 text-sm">{description}</p>}
      </div>

      {config && (
        <section className="bg-slate-900/80 backdrop-blur border border-slate-800 hover:border-cyan-900 rounded-lg p-4 transition-colors">
          <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-3">Config</h2>
          {config}
        </section>
      )}

      {input && (
        <section className="bg-slate-900/80 backdrop-blur border border-slate-800 hover:border-cyan-900 rounded-lg p-4 transition-colors">
          <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-3">Input</h2>
          {input}
        </section>
      )}

      {warning}

      {output && (
        <section className="bg-slate-900/80 backdrop-blur border border-slate-800 hover:border-cyan-900 rounded-lg p-4 transition-colors">
          <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-3">Output</h2>
          {output}
        </section>
      )}
    </div>
  );
}

/** Small reusable output box with a copy button, used inside the Output slot.
 *  Pass showQrButton to also offer a "Generate QR" button that renders the
 *  output value as a scannable QR code inline. */
export function OutputBox({ value, placeholder = "Output will appear here...", showQrButton = false }) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrError, setQrError] = useState("");

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleGenerateQr = async () => {
    setQrError("");
    if (!value) return;
    try {
      const url = await QRCode.toDataURL(value, { width: 260, margin: 2 });
      setQrDataUrl(url);
    } catch (e) {
      setQrError("Couldn't generate QR — output may be too long for a QR code.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <pre className="font-mono text-sm bg-black/40 border border-slate-800 rounded-md p-3 min-h-[80px] whitespace-pre-wrap break-all text-emerald-400">
          {value || <span className="text-slate-600">{placeholder}</span>}
        </pre>
        {value && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>

      {showQrButton && value && (
        <div className="space-y-2">
          <button
            onClick={handleGenerateQr}
            className="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
          >
            Generate QR
          </button>
          {qrError && <p className="text-red-400 text-xs">{qrError}</p>}
          {qrDataUrl && (
            <img src={qrDataUrl} alt="QR code of output" className="rounded-md border border-slate-800" />
          )}
        </div>
      )}
    </div>
  );
}

/** Reusable red warning banner for suspicious decrypted content. */
export function WarningBanner({ message }) {
  if (!message) return null;
  return (
    <div className="bg-red-950 border border-red-700 text-red-300 rounded-lg p-4 text-sm">
      {message}
    </div>
  );
}
