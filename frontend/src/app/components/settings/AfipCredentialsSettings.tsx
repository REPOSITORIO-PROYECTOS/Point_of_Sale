import { useEffect, useState } from "react";
import { PosAPI, readFileAsText, type AfipConfigStatus } from "../../../lib/pos-api";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { FileKey, ShieldCheck, Upload } from "lucide-react";

export function AfipCredentialsSettings() {
  const [status, setStatus] = useState<AfipConfigStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isSavingCert, setIsSavingCert] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [cuit, setCuit] = useState("");
  const [puntoVenta, setPuntoVenta] = useState("1");
  const [production, setProduction] = useState(false);
  const [certificado, setCertificado] = useState("");
  const [clavePrivada, setClavePrivada] = useState("");

  const loadStatus = async () => {
    setIsLoading(true);

    try {
      const config = await PosAPI.getAfipConfig();
      setStatus(config);
      setCuit(config.cuit ?? "");
      setPuntoVenta(String(config.puntoVenta ?? 1));
      setProduction(config.production ?? false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar la configuración AFIP");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const handleCertificateFile = async (file: File | undefined) => {
    if (!file) return;
    const content = await readFileAsText(file);
    setCertificado(content);
  };

  const handlePrivateKeyFile = async (file: File | undefined) => {
    if (!file) return;
    const content = await readFileAsText(file);
    setClavePrivada(content);
  };

  const handleSavePrivateKey = async () => {
    setIsSavingKey(true);

    try {
      const result = await PosAPI.saveAfipPrivateKey({
        cuit,
        clavePrivada,
        puntoVenta: Number(puntoVenta),
        production,
      });

      setStatus(result.status);
      toast.success("Clave privada guardada. Importá el certificado cuando AFIP lo apruebe.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la clave privada");
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleImportCertificate = async () => {
    setIsSavingCert(true);

    try {
      const result = await PosAPI.importAfipCertificate({ certificado });

      setStatus(result.status);
      toast.success("Certificado AFIP importado correctamente");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo importar el certificado");
    } finally {
      setIsSavingCert(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSavingAll(true);

    try {
      const result = await PosAPI.importAfipCredentials({
        cuit,
        certificado,
        clavePrivada,
        puntoVenta: Number(puntoVenta),
        production,
      });

      setStatus(result.status);
      toast.success("Certificados AFIP importados correctamente");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron guardar los certificados");
    } finally {
      setIsSavingAll(false);
    }
  };

  const showCertificateStep = Boolean(status?.pendingCertificate || (status?.hasPrivateKey && !status?.hasCertificate));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            Certificados AFIP
          </CardTitle>
          <CardDescription>
            Guardá la clave privada mientras AFIP procesa el CSR. Cuando llegue el certificado (.crt), importalo para completar la configuración.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={status?.configured ? "default" : "secondary"}>
              {status?.configured ? "Configurado" : status?.pendingCertificate ? "Certificado pendiente" : "Pendiente"}
            </Badge>
            <Badge variant={status?.hasCertificate ? "outline" : "destructive"}>
              Certificado {status?.hasCertificate ? "OK" : "faltante"}
            </Badge>
            <Badge variant={status?.hasPrivateKey ? "outline" : "destructive"}>
              Clave {status?.hasPrivateKey ? "OK" : "faltante"}
            </Badge>
          </div>

          {status?.updatedAt && (
            <p className="text-sm text-muted-foreground">
              Última actualización: {new Date(status.updatedAt).toLocaleString()}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="afip-cuit">CUIT emisor</Label>
              <Input
                id="afip-cuit"
                value={cuit}
                onChange={(event) => setCuit(event.target.value)}
                placeholder="20123456789"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="afip-punto-venta">Punto de venta</Label>
              <Input
                id="afip-punto-venta"
                type="number"
                min={1}
                value={puntoVenta}
                onChange={(event) => setPuntoVenta(event.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="afip-production">Ambiente producción</Label>
              <p className="text-sm text-muted-foreground">
                Desactivado = homologación AFIP
              </p>
            </div>
            <Switch
              id="afip-production"
              checked={production}
              onCheckedChange={setProduction}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileKey className="size-5" />
            Paso 1 — Clave privada
          </CardTitle>
          <CardDescription>
            Generá o importá la clave privada y guardala localmente mientras esperás el certificado de AFIP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="afip-key-file">Clave privada (.key)</Label>
            <Input
              id="afip-key-file"
              type="file"
              accept=".key,.pem,text/plain"
              className="mt-1"
              onChange={(event) => void handlePrivateKeyFile(event.target.files?.[0])}
            />
          </div>

          <div>
            <Label htmlFor="afip-key-text">Contenido clave privada PEM</Label>
            <Textarea
              id="afip-key-text"
              value={clavePrivada}
              onChange={(event) => setClavePrivada(event.target.value)}
              placeholder="-----BEGIN PRIVATE KEY-----"
              className="mt-1 min-h-28 font-mono text-xs"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => void loadStatus()} disabled={isLoading || isSavingKey}>
              Recargar
            </Button>
            <Button onClick={() => void handleSavePrivateKey()} disabled={isSavingKey || !cuit || !clavePrivada}>
              <Upload className="size-4 mr-2" />
              {isSavingKey ? "Guardando..." : "Guardar clave privada"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {(showCertificateStep || certificado) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5" />
              Paso 2 — Certificado aprobado
            </CardTitle>
            <CardDescription>
              Cuando AFIP apruebe el CSR, importá el archivo .crt para habilitar la facturación electrónica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="afip-cert-file">Certificado (.crt)</Label>
              <Input
                id="afip-cert-file"
                type="file"
                accept=".crt,.pem,.cer,text/plain"
                className="mt-1"
                onChange={(event) => void handleCertificateFile(event.target.files?.[0])}
              />
            </div>

            <div>
              <Label htmlFor="afip-cert-text">Contenido certificado PEM</Label>
              <Textarea
                id="afip-cert-text"
                value={certificado}
                onChange={(event) => setCertificado(event.target.value)}
                placeholder="-----BEGIN CERTIFICATE-----"
                className="mt-1 min-h-28 font-mono text-xs"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => void handleImportCertificate()} disabled={isSavingCert || !certificado}>
                <Upload className="size-4 mr-2" />
                {isSavingCert ? "Importando..." : "Importar certificado"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Importación completa (opcional)</CardTitle>
          <CardDescription>
            Si ya tenés certificado y clave, podés importar ambos en un solo paso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => void handleSaveAll()}
              disabled={isSavingAll || !cuit || !certificado || !clavePrivada}
            >
              {isSavingAll ? "Guardando..." : "Importar certificado y clave juntos"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
