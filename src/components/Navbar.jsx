export default function Navbar({ onToggleSidebar, onHelp }) {
  return (
    <header className="h-14 bg-slate-950/80 backdrop-blur border-b border-cyan-900/50 flex items-center px-4 gap-3">
      <button
        onClick={onToggleSidebar}
        className="md:hidden text-slate-300 border border-slate-700 rounded px-2 py-1"
      >
        ☰
      </button>
      <span className="text-cyan-400 font-mono font-bold text-lg tracking-tight glitch-hover">
        CryptoToolkit<span className="cursor-blink text-cyan-500">_</span>
      </span>
      <button
        onClick={onHelp}
        title="Help / guide"
        className="ml-auto w-7 h-7 rounded-full border border-cyan-800 text-cyan-400 hover:bg-cyan-950 hover:shadow-glow-sm text-sm transition-shadow"
      >
        ?
      </button>
    </header>
  );
}
