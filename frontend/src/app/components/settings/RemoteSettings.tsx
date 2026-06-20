import { useCallback, useEffect, useState } from "react";
import { PosAPI } from "../../../lib/pos-api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Cloud, CloudOff, Link2, Radio, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function RemoteSettings() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof PosAPI.getRemoteStatus>> | null>(null);
  const [config, setConfig] = useState<Awaited<ReturnType<typeof PosAPI.getRemoteConfig>> | null>(null);
  const [pairingCode, setPairingCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPairing, setIsPairing] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [remoteStatus, remoteConfig] = await Promise.all([
        PosAPI.getRemoteStatus(),
        PosAPI.getRemoteConfig(),
      ]);
      setStatus(remoteStatus);
      setConfig(remoteConfig);
    } catch (error) {
      toast.error("No se pudo cargar el estado remoto");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePair = async () => {
    const code = pairingCode.trim().toUpperCase();
    if (code.length < 4) {
      toast.error("Ingresá un código válido");
      return;
    }

    setIsPairing(true);
    try {
      const result = await PosAPI.pairRemote(code);
      toast.success(`Emparejado: ${result.registerLabel} (${result.clientNumber})`);
      setPairingCode("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo emparejar");
    } finally {
      setIsPairing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Conexión remota</h3>
          <p className="text-sm text-muted-foreground">
            Emparejá esta caja con el portal POS Remoto para supervisión desde el celular.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={isLoading}>
          <RefreshCw className={`size-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status?.connected ? (
              <Cloud className="size-5 text-green-600" />
            ) : (
              <CloudOff className="size-5 text-muted-foreground" />
            )}
            Estado del agente
          </CardTitle>
          <CardDescription>Relay en {status?.relayUrl ?? "—"}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground mb-1">Emparejado</p>
            <Badge variant={status?.paired ? "default" : "secondary"}>
              {status?.paired ? "Sí" : "No"}
            </Badge>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground mb-1">Conexión WebSocket</p>
            <Badge variant={status?.connected ? "default" : "outline"}>
              {status?.connected ? "Conectado" : "Desconectado"}
            </Badge>
          </div>
          <div className="rounded-lg border p-3 sm:col-span-2">
            <p className="text-xs text-muted-foreground mb-1">Caja registrada</p>
            <p className="font-medium">
              {config?.registerLabel ?? status?.registerLabel ?? "Sin emparejar"}
            </p>
            {config?.clientNumber ? (
              <p className="text-sm text-muted-foreground">Cliente {config.clientNumber}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="size-5" />
            Emparejar caja
          </CardTitle>
          <CardDescription>
            1. En el portal (Emparejar) generá y confirmá el código para tu cliente. 2. Ingresalo acá en el POS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="pairing-code">Código de emparejamiento</Label>
            <Input
              id="pairing-code"
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              className="mt-1 font-mono tracking-widest uppercase"
              maxLength={12}
            />
          </div>
          <Button onClick={() => void handlePair()} disabled={isPairing || !pairingCode.trim()}>
            <Link2 className="size-4 mr-2" />
            {isPairing ? "Emparejando…" : "Completar emparejamiento"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Portal dev:{" "}
            <a href="http://localhost:5174" target="_blank" rel="noreferrer" className="underline">
              http://localhost:5174
            </a>
            {" · "}
            Relay API: puerto 5090
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
