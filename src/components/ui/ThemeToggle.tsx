import { useEffect, useState } from "react";

import {
  applyTheme,
  getPreferredTheme,
  saveTheme,
  THEME_STORAGE_KEY,
} from "../../lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState(getPreferredTheme);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  useEffect(() => {
    const synchronize = () => setTheme(getPreferredTheme());
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) synchronize();
    };
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    media?.addEventListener("change", synchronize);
    window.addEventListener("storage", onStorage);
    return () => {
      media?.removeEventListener("change", synchronize);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <button
      type="button"
      className="theme-toggle"
      role="switch"
      aria-checked={theme === "dark"}
      aria-label="Dark mode"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        saveTheme(next);
        setTheme(next);
      }}
    >
      <span>Dark mode</span>
      <span className="theme-switch-track" aria-hidden="true">
        <span />
      </span>
    </button>
  );
}
