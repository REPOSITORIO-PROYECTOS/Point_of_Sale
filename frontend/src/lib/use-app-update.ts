import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { isElectronEnvironment, type AppUpdateCheckResult } from "./desktop-api";

export type AppUpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "not-available"
  | "error"
  | "skipped";

type AppUpdateEvent = {
  status:
    | "checking"
    | "available"
    | "not-available"
    | "progress"
    | "downloaded"
    | "error"
    | "skipped";
  payload?: unknown;
};

const SKIPPED_TOAST_KEY = "pos-update-skipped-toast-shown";

function readVersionFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const version = (payload as { version?: unknown }).version;
  return typeof version === "string" ? version : null;
}

function readMessageFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const message = (payload as { message?: unknown }).message;
  return typeof message === "string" ? message : null;
}

export function useAppUpdate() {
  const [status, setStatus] = useState<AppUpdateStatus>("idle");
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState<AppUpdateCheckResult["reason"] | null>(null);
  const isDesktop = isElectronEnvironment();
  const skippedToastShown = useRef(false);

  useEffect(() => {
    if (!isDesktop || !window.desktop?.onUpdateStatus) {
      return;
    }

    const unsubscribe = window.desktop.onUpdateStatus((event: AppUpdateEvent) => {
      switch (event.status) {
        case "checking":
          setStatus("checking");
          setErrorMessage(null);
          break;
        case "available": {
          const version = readVersionFromPayload(event.payload);
          setRemoteVersion(version);
          setStatus("available");
          toast.info(version ? `Actualización ${version} disponible` : "Actualización disponible", {
            description: "Se descargará en segundo plano.",
          });
          break;
        }
        case "progress": {
          const percent = (event.payload as { percent?: number } | undefined)?.percent;
          setStatus("downloading");
          if (typeof percent === "number") {
            setProgressPercent(Math.round(percent));
          }
          break;
        }
        case "downloaded": {
          const version = readVersionFromPayload(event.payload);
          setRemoteVersion(version);
          setStatus("ready");
          toast.success("Actualización lista", {
            description: "Reiniciá la app para instalar la nueva versión.",
            duration: Infinity,
            action: {
              label: "Reiniciar",
              onClick: () => {
                void window.desktop?.installUpdate?.();
              },
            },
          });
          break;
        }
        case "not-available":
          setStatus("not-available");
          break;
        case "skipped": {
          const reason = (event.payload as { reason?: AppUpdateCheckResult["reason"] } | undefined)?.reason;
          setSkipReason(reason ?? null);
          setStatus("skipped");
          setErrorMessage(null);

          if (!skippedToastShown.current && reason === "no_token" && !sessionStorage.getItem(SKIPPED_TOAST_KEY)) {
            skippedToastShown.current = true;
            sessionStorage.setItem(SKIPPED_TOAST_KEY, "1");
            toast.message("Actualizaciones automáticas no configuradas", {
              description: "Configurá updater.env en AppData o actualizá manualmente con el instalador.",
              duration: 6000,
            });
          }
          break;
        }
        case "error": {
          const message =
            readMessageFromPayload(event.payload) ?? "No se pudo comprobar actualizaciones";
          setStatus("error");
          setErrorMessage(message);
          break;
        }
        default:
          break;
      }
    });

    return unsubscribe;
  }, [isDesktop]);

  const checkForUpdates = useCallback(async () => {
    if (!window.desktop?.checkForUpdates) {
      return { ok: false, message: "Actualizaciones solo en la app de escritorio" };
    }

    setStatus("checking");
    setErrorMessage(null);

    try {
      const result = await window.desktop.checkForUpdates();

      if (result.skipped) {
        setSkipReason(result.reason ?? null);
        setStatus("skipped");
        if (result.reason === "no_token") {
          toast.message("Actualizaciones no configuradas", {
            description: result.message,
            duration: 5000,
          });
        }
        return result;
      }

      if (!result.ok) {
        setStatus("error");
        setErrorMessage(result.message ?? "Error al buscar actualizaciones");
        toast.error("No se pudo buscar actualizaciones", {
          description: result.message,
        });
        return result;
      }

      if (result.version) {
        setRemoteVersion(result.version);
      }

      setStatus((current) => {
        if (current === "ready" || current === "downloading" || current === "available") {
          return current;
        }
        toast.message("Ya tenés la última versión");
        return "not-available";
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes("No handler registered")
          ? "Actualizá a la versión 0.0.5 o superior para buscar actualizaciones desde la app."
          : "No se pudo buscar actualizaciones";
      setStatus("skipped");
      setErrorMessage(message);
      return { ok: false, skipped: true, message };
    }
  }, []);

  const installUpdate = useCallback(async () => {
    if (!window.desktop?.installUpdate) {
      return;
    }
    await window.desktop.installUpdate();
  }, []);

  return {
    isDesktop,
    status,
    remoteVersion,
    progressPercent,
    errorMessage,
    skipReason,
    checkForUpdates,
    installUpdate,
  };
}
