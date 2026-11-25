import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { loadSettings, saveSettings } from "./storage";
import { setSoundEnabled } from "./sound";
import type { Settings } from "./types";

interface Ctx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  resolvedTheme: "dark" | "light";
}

const SettingsContext = createContext<Ctx | null>(null);

const systemTheme = () =>
  window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [sys, setSys] = useState<"dark" | "light">(systemTheme);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const on = () => setSys(mq.matches ? "light" : "dark");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const resolvedTheme = settings.theme === "system" ? sys : settings.theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolvedTheme === "dark" ? "#0a0a15" : "#f4f2fc");
  }, [resolvedTheme]);

  useEffect(() => {
    document.documentElement.dataset.board = settings.boardTheme;
    document.documentElement.dataset.motion = settings.animations ? "on" : "off";
    setSoundEnabled(settings.sound);
  }, [settings.boardTheme, settings.animations, settings.sound]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  return <SettingsContext.Provider value={{ settings, update, resolvedTheme }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
