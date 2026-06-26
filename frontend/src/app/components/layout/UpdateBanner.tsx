import { Download, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "../ui/button";
import { useAppUpdate } from "../../../lib/app-update-provider";

export function UpdateBanner() {
  const { isDesktop, status, remoteVersion, progressPercent, errorMessage, checkForUpdates, installUpdate } =
    useAppUpdate();

  if (!isDesktop) {
    return null;
  }

  const showBanner =
    status === "available" ||
    status === "downloading" ||
    status === "ready" ||
    status === "installing" ||
    status === "error";

  if (!showBanner) {
    return null;
  }

  return (
    <div className="border-b bg-muted/60 px-4 py-2 text-sm flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-foreground">
        {status === "available" && (
          <>
            <Download className="size-4 shrink-0" />
            <span>
              Nueva versión{remoteVersion ? ` ${remoteVersion}` : ""} — descargando en segundo plano…
            </span>
          </>
        )}
        {status === "downloading" && (
          <>
            <RefreshCw className="size-4 shrink-0 animate-spin" />
            <span>
              Descargando actualización
              {progressPercent != null ? ` (${progressPercent}%)` : "…"}
            </span>
          </>
        )}
        {status === "ready" && (
          <>
            <RotateCcw className="size-4 shrink-0" />
            <span>Actualización lista para instalar{remoteVersion ? ` (${remoteVersion})` : ""}</span>
          </>
        )}
        {status === "installing" && (
          <>
            <RefreshCw className="size-4 shrink-0 animate-spin" />
            <span>Cerrando servicios e instalando{remoteVersion ? ` ${remoteVersion}` : ""}…</span>
          </>
        )}
        {status === "error" && (
          <span className="text-destructive">{errorMessage ?? "Error al buscar actualizaciones"}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {status === "ready" && (
          <Button size="sm" onClick={() => void installUpdate()}>
            Reiniciar e instalar
          </Button>
        )}
        {status === "error" && (
          <Button size="sm" variant="outline" onClick={() => void checkForUpdates()}>
            Reintentar
          </Button>
        )}
      </div>
    </div>
  );
}
