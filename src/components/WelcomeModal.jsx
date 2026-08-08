const SECTIONS = [
  {
    title: "Encryption",
    body: "Encrypt or decrypt text and files with AES, DES, TripleDES, RC4, or Rabbit. Everything runs in your browser — nothing is uploaded anywhere.",
  },
  {
    title: "Hashing",
    body: "Generate MD5/SHA/SHA3 checksums for text or files, or password-style hashes with bcrypt/scrypt.",
  },
  {
    title: "Cipher Cracker",
    body: "Break classical/weak ciphers (Caesar, XOR, Vigenère, substitution) and short/common keys via frequency analysis — a hands-on demo of why key strength matters.",
  },
  {
    title: "Safety checks",
    body: "Decrypting text scans for suspicious URLs; decrypting files checks for dangerous extensions and mismatched file signatures — both automatic.",
  },
  {
    title: "Other tools",
    body: "Password generator, hash identifier, and an encrypted-text identifier round out the toolkit.",
  },
];

export default function WelcomeModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-lg w-full p-6 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-cyan-400">Welcome to CryptoToolkit</h2>
          <p className="text-slate-400 text-sm mt-1">A browser-based cybersecurity toolkit. Quick tour:</p>
        </div>

        <div className="space-y-3">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <p className="text-sm font-semibold text-slate-200">{s.title}</p>
              <p className="text-sm text-slate-400">{s.body}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-sm font-medium"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
