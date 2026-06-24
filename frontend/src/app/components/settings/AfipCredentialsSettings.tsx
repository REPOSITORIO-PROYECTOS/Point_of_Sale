import { useEffect, useState } from "react";
import { PosAPI, readFileAsText, type AfipConfigStatus } from "../../../lib/pos-api";
import {
  AFIP_CONDICION_IVA_OPTIONS,
  AFIP_TIPO_COMPROBANTE_OPTIONS,
  AFIP_TIPO_DOCUMENTO_OPTIONS,
  DEFAULT_AFIP_BILLING_DEFAULTS,
  isValidAfipCuit,
  normalizeAfipBillingDefaults,
  normalizeAfipCuit,
  validateAfipCertificatePem,
  validateAfipPrivateKeyPem,
} from "../../../lib/afip-fiscal";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from "sonner";
import { ClipboardPaste, Copy, Download, FileKey, FileText, KeyRound, ShieldCheck, Upload } from "lucide-react";

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/x-pem-file" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AfipCredentialsSettings() {
  const [status, setStatus] = useState<AfipConfigStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingCsr, setIsGeneratingCsr] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isSavingCert, setIsSavingCert] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [cuit, setCuit] = useState("");
  const [organization, setOrganization] = useState("PointOfSale");
  const [commonName, setCommonName] = useState("PointOfSale");
  const [puntoVenta, setPuntoVenta] = useState("1");
  const [production, setProduction] = useState(false);
  const [csr, setCsr] = useState("");
  const [certificado, setCertificado] = useState("");
  const [clavePrivada, setClavePrivada] = useState("");
  const [billingTipoAfip, setBillingTipoAfip] = useState(String(DEFAULT_AFIP_BILLING_DEFAULTS.tipoAfip));
  const [billingTipoDocumento, setBillingTipoDocumento] = useState(String(DEFAULT_AFIP_BILLING_DEFAULTS.tipoDocumento));
  const [billingDocumento, setBillingDocumento] = useState(DEFAULT_AFIP_BILLING_DEFAULTS.documento);
  const [billingIdCondicionIva, setBillingIdCondicionIva] = useState(String(DEFAULT_AFIP_BILLING_DEFAULTS.idCondicionIva));
  const [billingIvaRate, setBillingIvaRate] = useState(String(DEFAULT_AFIP_BILLING_DEFAULTS.ivaRatePercent));
  const [isSavingBillingDefaults, setIsSavingBillingDefaults] = useState(false);

  const loadStatus = async () => {
    setIsLoading(true);

    try {
      const config = await PosAPI.getAfipConfig();
      setStatus(config);
      setCuit(config.cuit ?? "");
      setPuntoVenta(String(config.puntoVenta ?? 1));
      setProduction(config.production ?? false);
      const billing = normalizeAfipBillingDefaults(config.billingDefaults);
      setBillingTipoAfip(String(billing.tipoAfip));
      setBillingTipoDocumento(String(billing.tipoDocumento));
      setBillingDocumento(billing.documento);
      setBillingIdCondicionIva(String(billing.idCondicionIva));
      setBillingIvaRate(String(billing.ivaRatePercent));
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
    const validation = validateAfipPrivateKeyPem(content);
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }
    setClavePrivada(validation.pem);
    toast.success(`Clave cargada desde ${file.name}`);
  };

  const handlePastePrivateKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const validation = validateAfipPrivateKeyPem(text);
      if (!validation.ok) {
        toast.error(validation.message);
        return;
      }
      setClavePrivada(validation.pem);
      toast.success("Clave pegada desde el portapapeles");
    } catch {
      toast.error("No se pudo leer el portapapeles");
    }
  };

  const handleGenerateCsr = async () => {
    setIsGeneratingCsr(true);

    try {
      const result = await PosAPI.generateAfipCsr({
        cuit,
        organization,
        commonName,
        puntoVenta: Number(puntoVenta),
        production,
      });

      setCsr(result.csr);
      setStatus(result.status);
      setClavePrivada("");
      toast.success("Clave generada y guardada. Subí el CSR a AFIP y después importá el .crt aprobado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el CSR");
    } finally {
      setIsGeneratingCsr(false);
    }
  };

  const handleCopyCsr = async () => {
    if (!csr) return;

    try {
      await navigator.clipboard.writeText(csr);
      toast.success("CSR copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar el CSR");
    }
  };

  const handleDownloadCsr = () => {
    if (!csr) return;
    const normalizedCuit = cuit.replace(/\D/g, "") || "empresa";
    downloadTextFile(`afip-${normalizedCuit}-pedido.csr`, csr);
  };

  const handleSavePrivateKey = async () => {
    if (!isValidAfipCuit(cuit)) {
      toast.error("Completá el CUIT emisor (11 dígitos) en la sección superior");
      return;
    }

    const keyValidation = validateAfipPrivateKeyPem(clavePrivada);
    if (!keyValidation.ok) {
      toast.error(keyValidation.message);
      return;
    }

    setIsSavingKey(true);

    try {
      const result = await PosAPI.saveAfipPrivateKey({
        cuit: normalizeAfipCuit(cuit),
        clavePrivada: keyValidation.pem,
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
    const certValidation = validateAfipCertificatePem(certificado);
    if (!certValidation.ok) {
      toast.error(certValidation.message);
      return;
    }

    setIsSavingCert(true);

    try {
      const result = await PosAPI.importAfipCertificate({ certificado: certValidation.pem });

      setStatus(result.status);
      setCsr("");
      toast.success("Certificado AFIP importado y unido con la clave guardada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo importar el certificado");
    } finally {
      setIsSavingCert(false);
    }
  };

  const handleSaveAll = async () => {
    if (!isValidAfipCuit(cuit)) {
      toast.error("Completá el CUIT emisor (11 dígitos) en la sección superior");
      return;
    }

    const keyValidation = validateAfipPrivateKeyPem(clavePrivada);
    if (!keyValidation.ok) {
      toast.error(keyValidation.message);
      return;
    }

    const certValidation = validateAfipCertificatePem(certificado);
    if (!certValidation.ok) {
      toast.error(certValidation.message);
      return;
    }

    setIsSavingAll(true);

    try {
      const result = await PosAPI.importAfipCredentials({
        cuit: normalizeAfipCuit(cuit),
        certificado: certValidation.pem,
        clavePrivada: keyValidation.pem,
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

  const handleSaveBillingDefaults = async () => {
    setIsSavingBillingDefaults(true);

    try {
      const result = await PosAPI.updateAfipBillingDefaults({
        tipoAfip: Number(billingTipoAfip),
        tipoDocumento: Number(billingTipoDocumento),
        documento: billingDocumento.trim(),
        idCondicionIva: Number(billingIdCondicionIva),
        ivaRatePercent: Number(billingIvaRate),
      });
      setStatus(result.status);
      toast.success("Valores por defecto de facturación guardados");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron guardar los valores por defecto");
    } finally {
      setIsSavingBillingDefaults(false);
    }
  };

  const showCertificateStep = Boolean(status?.pendingCertificate || (status?.hasPrivateKey && !status?.hasCertificate));
  const privateKeyValidation = validateAfipPrivateKeyPem(clavePrivada);
  const canSavePrivateKey = isValidAfipCuit(cuit) && privateKeyValidation.ok;
  const privateKeySaveHint = !isValidAfipCuit(cuit)
    ? "Completá el CUIT emisor (11 dígitos) arriba"
    : !privateKeyValidation.ok && clavePrivada.trim()
      ? privateKeyValidation.message
      : !clavePrivada.trim()
        ? "Elegí un archivo .key o pegá el PEM completo abajo"
        : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            Certificados AFIP
          </CardTitle>
          <CardDescription>
            El sistema puede generar la clave privada, guardarla localmente y darte el CSR para subirlo a AFIP.
            Cuando AFIP apruebe el certificado (.crt), importalo acá y el sistema lo une con la clave guardada.
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
            <div>
              <Label htmlFor="afip-organization">Empresa (O=)</Label>
              <Input
                id="afip-organization"
                value={organization}
                onChange={(event) => setOrganization(event.target.value)}
                placeholder="Mi Empresa"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="afip-common-name">Sistema (CN=)</Label>
              <Input
                id="afip-common-name"
                value={commonName}
                onChange={(event) => setCommonName(event.target.value)}
                placeholder="PointOfSale"
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
            <FileText className="size-5" />
            Facturación por defecto
          </CardTitle>
          <CardDescription>
            Valores que usa el POS al emitir factura con consumidor final. En el checkout podés cambiar el comprador
            para una venta puntual.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de comprobante</Label>
              <Select value={billingTipoAfip} onValueChange={setBillingTipoAfip}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AFIP_TIPO_COMPROBANTE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Alícuota IVA para desglose (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={billingIvaRate}
                onChange={(event) => setBillingIvaRate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo documento comprador</Label>
              <Select value={billingTipoDocumento} onValueChange={setBillingTipoDocumento}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AFIP_TIPO_DOCUMENTO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Número documento</Label>
              <Input
                value={billingDocumento}
                onChange={(event) => setBillingDocumento(event.target.value)}
                placeholder="0 para consumidor final"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Condición IVA comprador</Label>
              <Select value={billingIdCondicionIva} onValueChange={setBillingIdCondicionIva}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AFIP_CONDICION_IVA_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => void handleSaveBillingDefaults()} disabled={isSavingBillingDefaults}>
              {isSavingBillingDefaults ? "Guardando..." : "Guardar valores por defecto"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5" />
            Paso 1 — Generar clave y CSR
          </CardTitle>
          <CardDescription>
            Generá la clave RSA 2048, guardala en el sistema y descargá el pedido CSR (sin aprobar) para subirlo en WSASS/AFIP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => void loadStatus()} disabled={isLoading || isGeneratingCsr}>
              Recargar
            </Button>
            <Button onClick={() => void handleGenerateCsr()} disabled={isGeneratingCsr || !cuit || status?.hasCertificate}>
              <KeyRound className="size-4 mr-2" />
              {isGeneratingCsr ? "Generando..." : "Generar clave y CSR"}
            </Button>
          </div>

          {(csr || showCertificateStep) && (
            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <Label htmlFor="afip-csr-text">Pedido CSR para AFIP</Label>
                <Textarea
                  id="afip-csr-text"
                  value={csr}
                  readOnly={!csr}
                  onChange={(event) => setCsr(event.target.value)}
                  placeholder="-----BEGIN CERTIFICATE REQUEST-----"
                  className="mt-1 min-h-32 font-mono text-xs"
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => void handleCopyCsr()} disabled={!csr}>
                  <Copy className="size-4 mr-2" />
                  Copiar CSR
                </Button>
                <Button variant="outline" onClick={handleDownloadCsr} disabled={!csr}>
                  <Download className="size-4 mr-2" />
                  Descargar .csr
                </Button>
              </div>
              {status?.hasPrivateKey && !status?.hasCertificate && (
                <p className="text-sm text-muted-foreground">
                  La clave privada ya quedó guardada en el sistema. No hace falta volver a subirla cuando importes el .crt.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileKey className="size-5" />
            Paso 1 alternativo — Importar clave existente
          </CardTitle>
          <CardDescription>
            Si ya generaste la clave con OpenSSL u otra herramienta, podés subir el archivo .key o pegar el PEM
            completo. No hace falta elegir archivo si pegás el texto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="afip-key-file">Archivo de clave privada (opcional)</Label>
            <Input
              id="afip-key-file"
              type="file"
              accept=".key,.pem,text/plain"
              className="mt-1"
              onChange={(event) => void handlePrivateKeyFile(event.target.files?.[0])}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Formatos aceptados: PKCS#8 (<code className="text-[11px]">BEGIN PRIVATE KEY</code>) o RSA (
              <code className="text-[11px]">BEGIN RSA PRIVATE KEY</code>). Sin contraseña.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="afip-key-text">Contenido clave privada PEM</Label>
              <div className="flex items-center gap-2">
                {privateKeyValidation.ok && (
                  <Badge variant="outline" className="text-xs">
                    PEM válido
                  </Badge>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => void handlePastePrivateKey()}>
                  <ClipboardPaste className="size-3.5 mr-1.5" />
                  Pegar
                </Button>
              </div>
            </div>
            <Textarea
              id="afip-key-text"
              value={clavePrivada}
              onChange={(event) => setClavePrivada(event.target.value)}
              placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
              className="mt-1 min-h-28 font-mono text-xs"
            />
          </div>

          {privateKeySaveHint && (
            <p className="text-sm text-amber-700 dark:text-amber-400">{privateKeySaveHint}</p>
          )}

          <div className="flex justify-end">
            <Button onClick={() => void handleSavePrivateKey()} disabled={isSavingKey || !canSavePrivateKey}>
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
              Cuando AFIP apruebe el CSR, importá el archivo .crt. El sistema lo une automáticamente con la clave guardada.
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
                {isSavingCert ? "Importando..." : "Importar certificado aprobado"}
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
