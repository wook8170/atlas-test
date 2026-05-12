import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import type { PomodoroSettings } from "@/domain/types";
import { DEFAULT_SETTINGS, LocalStateRepository } from "@/repositories/LocalStateRepository";

type OfflineAppContextValue = {
  ready: boolean;
  online: boolean;
  settings: PomodoroSettings;
  updateSettings: (patch: Partial<PomodoroSettings>) => Promise<void>;
};

const OfflineAppContext = createContext<OfflineAppContextValue | null>(null);

function getOnlineState(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function OfflineAppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(getOnlineState);
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let disposed = false;

    void LocalStateRepository.getSettings()
      .then((nextSettings) => {
        if (!disposed) {
          setSettings(nextSettings);
        }
      })
      .finally(() => {
        if (!disposed) {
          setReady(true);
        }
      });

    function handleOnlineStatus() {
      setOnline(getOnlineState());
    }

    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);

    return () => {
      disposed = true;
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    };
  }, []);

  async function updateSettings(patch: Partial<PomodoroSettings>) {
    await LocalStateRepository.updateSettings(patch);
    setSettings(await LocalStateRepository.getSettings());
  }

  return (
    <OfflineAppContext.Provider value={{ ready, online, settings, updateSettings }}>
      {children}
    </OfflineAppContext.Provider>
  );
}

export function useOfflineApp() {
  const context = useContext(OfflineAppContext);
  if (!context) {
    throw new Error("useOfflineApp must be used within OfflineAppProvider");
  }
  return context;
}
