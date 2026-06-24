import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { isElectronEnvironment } from "./desktop-api";

export type AppUpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "not-available"
  | "error";

type AppUpdateEvent = {
  status: "checking" | "available" | "not-available" | "progress" | "downloaded" | "error";
  payload?: unknown;
};

function readVersionFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const version = (payload as { version?: unknown }).version;
  return typeof version === "string" ? version : null;
}

export function useAppUpdate() {
  const [status, setStatus] = useState<AppUpdateStatus>("idle");
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isDesktop = isElectronEnvironment();

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
        case "error": {
          const message =
            (event.payload as { message?: string } | undefined)?.message ??
            "No se pudo comprobar actualizaciones";
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
    const result = await window.desktop.checkForUpdates();
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

    if (status !== "ready" && status !== "downloading" && status !== "available") {
      setStatus("not-available");
      toast.message("Ya tenés la última versión");
    }

    return result;
  }, [status]);

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
    checkForUpdates,
    installUpdate,
  };
}
