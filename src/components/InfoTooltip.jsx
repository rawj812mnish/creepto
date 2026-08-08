import { useState } from "react";

export default function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block ml-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="w-4 h-4 rounded-full bg-slate-700 text-slate-300 text-[10px] leading-4 text-center align-middle hover:bg-slate-600"
      >
        i
      </button>
      {open && (
        <span className="absolute z-10 left-1/2 -translate-x-1/2 bottom-6 w-56 text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-md p-2 shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}
