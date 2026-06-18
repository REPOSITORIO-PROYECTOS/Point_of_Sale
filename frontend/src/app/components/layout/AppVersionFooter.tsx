import { useEffect, useRef, useState } from "react";
import { isElectronEnvironment } from "../../../lib/desktop-api";

const APP_VERSION = "0.0.1";
const CLICKS_TO_OPEN = 5;

type AppVersionFooterProps = {
  onOpenRecovery: () => void;
  clientNumberMasked?: string | null;
};

export function AppVersionFooter({ onOpenRecovery, clientNumberMasked }: AppVersionFooterProps) {
  const [clickCount, setClickCount] = useState(0);
  const clickTimer = useRef<number | null>(null);
  const isRecoveryAvailable = isElectronEnvironment() || import.meta.env.DEV;

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
        v{APP_VERSION}
      </button>
      {clientNumberMasked && (
        <span className="text-muted-foreground/80">Cliente {clientNumberMasked}</span>
      )}
    </footer>
  );
}
