"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "tnl-theme";

/**
 * Dark/Light segmented switch. The actual class toggle happens on
 * <html>, matching the inline no-flash script in app/layout.tsx which
 * reads the same localStorage key before the page paints.
 */
export default function ThemeToggle() {
  const [isLight, setIsLight] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsLight(document.documentElement.classList.contains("light"));
    setMounted(true);
  }, []);

  function setTheme(light: boolean) {
    document.documentElement.classList.toggle("light", light);
    try {
      localStorage.setItem(STORAGE_KEY, light ? "light" : "dark");
    } catch {
      // Private browsing etc. — theme just won't persist across reloads.
    }
    setIsLight(light);
  }

  // Avoid rendering the wrong state for a frame before we've read the
  // real value from the DOM on mount.
  if (!mounted) return <div className="h-[42px]" aria-hidden />;

  return (
    <div className="flex items-center gap-1.5 bg-bg2 p-1 rounded-2xl border border-line">
      <button
        type="button"
        onClick={() => setTheme(false)}
        className={`flex-1 py-2 rounded-xl text-[12.5px] font-bold transition-colors ${
          !isLight ? "bg-brandGreen text-[#06150e]" : "text-sub"
        }`}
      >
        Dark
      </button>
      <button
        type="button"
        onClick={() => setTheme(true)}
        className={`flex-1 py-2 rounded-xl text-[12.5px] font-bold transition-colors ${
          isLight ? "bg-brandGreen text-[#06150e]" : "text-sub"
        }`}
      >
        Light
      </button>
    </div>
  );
}
