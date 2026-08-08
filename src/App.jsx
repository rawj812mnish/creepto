import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import WelcomeModal from "./components/WelcomeModal";
import MatrixRain from "./components/MatrixRain";
import TextEncrypt from "./pages/TextEncrypt";
import FileEncrypt from "./pages/FileEncrypt";
import TextHash from "./pages/TextHash";
import FileHash from "./pages/FileHash";
import PasswordGenerator from "./pages/PasswordGenerator";
import HashIdentifier from "./pages/HashIdentifier";
import EncryptedTextIdentifier from "./pages/EncryptedTextIdentifier";
import CipherCracker from "./pages/CipherCracker";

const WELCOME_SEEN_KEY = "cryptotoolkit_welcome_seen";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(WELCOME_SEEN_KEY);
      if (!seen) setShowWelcome(true);
    } catch {
      // localStorage unavailable (private browsing etc.) - just skip auto-show
    }
  }, []);

  const closeWelcome = () => {
    setShowWelcome(false);
    try {
      localStorage.setItem(WELCOME_SEEN_KEY, "true");
    } catch {
      // ignore if storage is unavailable
    }
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0a0e14] text-slate-100 grid-bg scanlines relative">
        <MatrixRain />
        <div className="relative z-10">
          <Navbar onToggleSidebar={() => setSidebarOpen((v) => !v)} onHelp={() => setShowWelcome(true)} />
          <div className="flex">
            <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
            <main className="flex-1 p-6">
              <Routes>
                <Route path="/" element={<Navigate to="/encryption/text" replace />} />
                <Route path="/encryption/text" element={<TextEncrypt />} />
                <Route path="/encryption/files" element={<FileEncrypt />} />
                <Route path="/hashing/text" element={<TextHash />} />
                <Route path="/hashing/files" element={<FileHash />} />
                <Route path="/tools/password-generator" element={<PasswordGenerator />} />
                <Route path="/tools/hash-identifier" element={<HashIdentifier />} />
                <Route path="/tools/encrypted-text-identifier" element={<EncryptedTextIdentifier />} />
                <Route path="/tools/cipher-cracker" element={<CipherCracker />} />
              </Routes>
            </main>
          </div>
        </div>
        {showWelcome && <WelcomeModal onClose={closeWelcome} />}
      </div>
    </BrowserRouter>
  );
}
