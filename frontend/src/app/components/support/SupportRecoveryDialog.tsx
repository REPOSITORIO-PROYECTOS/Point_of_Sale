import { useEffect, useState } from "react";
import { PosAPI, type SupportRecoveryDiagnostics } from "../../../lib/pos-api";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type SupportRecoveryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SupportRecoveryDialog({ open, onOpenChange }: SupportRecoveryDialogProps) {
  const [recoveryKey, setRecoveryKey] = useState("");
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<SupportRecoveryDiagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setRecoveryKey("");
      setRecoveryToken(null);
      setDiagnostics(null);
      setError(null);
    }
  }, [open]);

  async function handleUnlock() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await PosAPI.supportRecoveryUnlock(recoveryKey);
      setRecoveryToken(result.recoveryToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clave de recuperación inválida");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDiagnostics() {
    if (!recoveryToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await PosAPI.supportRecoveryDiagnostics(recoveryToken);
      setDiagnostics(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo obtener diagnóstico");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExportJson() {
    if (!recoveryToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const payload = await PosAPI.supportRecoveryExportJson(recoveryToken);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `pos-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo exportar datos");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Recuperación de soporte</DialogTitle>
          <DialogDescription>
            Acceso restringido al equipo de desarrollo. Requiere clave de recuperación.
          </DialogDescription>
        </DialogHeader>

        {!recoveryToken ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="recoveryKey">Clave de recuperación</Label>
              <Input
                id="recoveryKey"
                type="password"
                value={recoveryKey}
                onChange={(event) => setRecoveryKey(event.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Sesión de recuperación activa (15 min).</p>
            {diagnostics && (
              <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-48">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleDiagnostics} disabled={isLoading}>
                Diagnóstico
              </Button>
              <Button variant="outline" onClick={handleExportJson} disabled={isLoading}>
                Exportar JSON
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {!recoveryToken && (
            <Button onClick={handleUnlock} disabled={isLoading || !recoveryKey}>
              Desbloquear
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
