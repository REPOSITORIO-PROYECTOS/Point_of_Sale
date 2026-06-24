import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { isElectronEnvironment } from "../../../lib/desktop-api";
import { useAppUpdate } from "../../../lib/app-update-provider";

const CLICKS_TO_OPEN = 5;

type AppVersionFooterProps = {
  onOpenRecovery: () => void;
  clientNumberMasked?: string | null;
};

export function AppVersionFooter({ onOpenRecovery, clientNumberMasked }: AppVersionFooterProps) {
  const [clickCount, setClickCount] = useState(0);
  const [desktopVersion, setDesktopVersion] = useState<string | null>(null);
  const clickTimer = useRef<number | null>(null);
  const isRecoveryAvailable = isElectronEnvironment() || import.meta.env.DEV;
  const { checkForUpdates, status: updateStatus } = useAppUpdate();
  const displayVersion = desktopVersion ?? __APP_VERSION__;

  useEffect(() => {
    if (!isElectronEnvironment() || !window.desktop?.getAppVersion) {
      return;
    }

    void window.desktop.getAppVersion().then(setDesktopVersion).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isRecoveryAvailable) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && event.shiftKey && event.altKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        onOpenRecovery();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isRecoveryAvailable, onOpenRecovery]);

  if (!isRecoveryAvailable) {
    return null;
  }

  function handleClick() {
    if (clickTimer.current) {
      window.clearTimeout(clickTimer.current);
    }

    const next = clickCount + 1;
    if (next >= CLICKS_TO_OPEN) {
      setClickCount(0);
      onOpenRecovery();
      return;
    }

    setClickCount(next);
    clickTimer.current = window.setTimeout(() => setClickCount(0), 2000);
  }

  return (
    <footer className="border-t px-4 py-1 text-xs text-muted-foreground flex items-center justify-center gap-3 select-none">
      <button type="button" className="hover:underline" onClick={handleClick}>
        v{displayVersion}
      </button>
      {isElectronEnvironment() && (
        <button
          type="button"
          className="inline-flex items-center gap-1 hover:underline disabled:opacity-50"
          disabled={updateStatus === "checking" || updateStatus === "downloading"}
          onClick={() => void checkForUpdates()}
        >
          <RefreshCw
            className={`size-3 ${updateStatus === "checking" || updateStatus === "downloading" ? "animate-spin" : ""}`}
          />
          Buscar actualización
        </button>
      )}
      {clientNumberMasked && (
        <span className="text-muted-foreground/80">Cliente {clientNumberMasked}</span>
      )}
    </footer>
  );
}
