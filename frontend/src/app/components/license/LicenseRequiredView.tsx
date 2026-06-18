import { useEffect, useState } from "react";
import { PosAPI } from "../../../lib/pos-api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

type LicenseRequiredViewProps = {
  onActivated: () => void;
  message?: string | null;
};

export function LicenseRequiredView({ onActivated, message }: LicenseRequiredViewProps) {
  const [licenseKey, setLicenseKey] = useState("");
  const [machineId, setMachineId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    PosAPI.getMachineId()
      .then((result) => setMachineId(result.machineId))
      .catch(() => setMachineId(null));
  }, []);

  async function handleActivate(event: React.FormEvent) {
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
    <div className="size-full flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Licencia requerida</CardTitle>
          <CardDescription>
            {message ?? "Pegue la clave de licencia emitida por soporte para esta instalación."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {machineId && (
            <p className="text-xs text-muted-foreground mb-4 break-all">
              ID de máquina: <span className="font-mono">{machineId}</span>
            </p>
          )}
          <form className="space-y-4" onSubmit={handleActivate}>
            <div>
              <Label htmlFor="licenseKey">Clave de licencia</Label>
              <Input
                id="licenseKey"
                value={licenseKey}
                onChange={(event) => setLicenseKey(event.target.value)}
                placeholder="POS...."
                className="mt-1 font-mono text-xs"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Activando..." : "Activar licencia"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
