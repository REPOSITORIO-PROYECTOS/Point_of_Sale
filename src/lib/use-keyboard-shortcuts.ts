import { useEffect } from "react";

type ShortcutKey = "F8" | "F12";
type ShortcutHandler = () => void;
type ShortcutMap = Partial<Record<ShortcutKey, ShortcutHandler>>;

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Solo activar si no estamos en un input o textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const key = event.key as ShortcutKey;
      const handler = shortcuts[key];

      if (handler) {
        event.preventDefault();
        handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [shortcuts]);
}
