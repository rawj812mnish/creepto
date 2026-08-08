/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        glow: "0 0 8px rgba(34, 211, 238, 0.5), 0 0 20px rgba(34, 211, 238, 0.15)",
        "glow-sm": "0 0 4px rgba(34, 211, 238, 0.4)",
      },
    },
  },
  plugins: [],
}

