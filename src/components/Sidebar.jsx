import { NavLink } from "react-router-dom";

const groups = [
  {
    label: "Encryption",
    links: [
      { to: "/encryption/text", label: "Text" },
      { to: "/encryption/files", label: "Files" },
    ],
  },
  {
    label: "Hashing",
    links: [
      { to: "/hashing/text", label: "Text" },
      { to: "/hashing/files", label: "Files" },
    ],
  },
  {
    label: "Tools",
    links: [
      { to: "/tools/password-generator", label: "Password Generator" },
      { to: "/tools/hash-identifier", label: "Hash Identifier" },
      { to: "/tools/encrypted-text-identifier", label: "Encrypted Text Identifier" },
      { to: "/tools/cipher-cracker", label: "Cipher Cracker" },
    ],
  },
];

export default function Sidebar({ open, onNavigate }) {
  return (
    <aside
      className={`${
        open ? "block" : "hidden"
      } md:block w-full md:w-56 shrink-0 bg-slate-950/60 backdrop-blur border-r border-cyan-900/50 md:min-h-[calc(100vh-56px)] p-4`}
    >
      {groups.map((group) => (
        <div key={group.label} className="mb-6">
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-2 px-2">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-sm transition-shadow ${
                    isActive
                      ? "bg-cyan-950 text-cyan-400 border border-cyan-700 shadow-glow-sm"
                      : "text-slate-300 hover:bg-slate-900 border border-transparent"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}
