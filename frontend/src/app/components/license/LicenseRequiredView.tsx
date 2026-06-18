import { FormEvent, useEffect, useState } from "react";
import { Copy, Check, KeyRound } from "lucide-react";
import { PosAPI } from "../../../lib/pos-api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

type LicenseRequiredViewProps = {
  onActivated: () => void;
  message?: string | null;
  machineId?: string | null;
};

export function LicenseRequiredView({ onActivated, message, machineId: initialMachineId }: LicenseRequiredViewProps) {
  const [licenseKey, setLicenseKey] = useState("");
  const [machineId, setMachineId] = useState(initialMachineId ?? "");
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialMachineId) {
      setMachineId(initialMachineId);
      return;
    }

    PosAPI.getMachineId()
      .then((response) => setMachineId(response.machineId))
      .catch(() => setMachineId(""));
  }, [initialMachineId]);

  async function handleCopyMachineId() {
    if (!machineId) return;
    await navigator.clipboard.writeText(machineId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function handleActivate(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await PosAPI.activateLicense(licenseKey.trim());
      onActivated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo activar la licencia");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="size-full flex items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-3">
          <div className="mx-auto size-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <KeyRound className="size-8 text-primary" />
          </div>
          <CardTitle className="text-center text-2xl">Activar licencia</CardTitle>
          <CardDescription className="text-center">
            {message ?? "Copiá el ID de máquina y enviáselo al equipo de soporte para recibir tu licencia."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="machineId">ID de máquina</Label>
            <div className="flex gap-2">
              <Input
                id="machineId"
                value={machineId}
                readOnly
                className="font-mono text-xs"
                placeholder="Obteniendo ID..."
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void handleCopyMachineId()}
                disabled={!machineId}
                aria-label="Copiar ID de máquina"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Este identificador vincula la licencia a este equipo. No expone datos sensibles del hardware.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleActivate}>
            <div className="space-y-2">
              <Label htmlFor="licenseKey">Clave de licencia</Label>
              <Textarea
                id="licenseKey"
                value={licenseKey}
                onChange={(event) => setLicenseKey(event.target.value)}
                placeholder="POS-LIC-v1...."
                className="font-mono text-xs min-h-24"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting || !licenseKey.trim()}>
              {isSubmitting ? "Activando..." : "Activar licencia"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
