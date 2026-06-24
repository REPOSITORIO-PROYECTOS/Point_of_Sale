import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../../lib/theme-context";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Switch } from "../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Upload, Printer, Eye, Monitor } from "lucide-react";
import { toast } from "sonner";
import { buildReceiptHtml, openReceiptPreview } from "../../../lib/receipt-template";
import { isElectronEnvironment, listSystemPrinters } from "../../../lib/desktop-api";
import {
  DEFAULT_PRINTER_SETTINGS,
  loadPrinterSettings,
  savePrinterSettings,
  type PrinterSettings,
} from "../../../lib/printer-settings-store";
import { printReceipt, previewReceiptText } from "../../../lib/print-receipt";
import type { PrinterType } from "../../../lib/printer-settings";

const PRINTER_TYPES: { value: PrinterType; label: string }[] = [
  { value: "epson", label: "Epson" },
  { value: "star", label: "Star" },
  { value: "tanca", label: "Tanca" },
  { value: "daruma", label: "Daruma" },
  { value: "brother", label: "Brother" },
  { value: "custom", label: "Otra / genérica" },
];

export function AppearanceSettings() {
  const { themeConfig, updateTheme, uploadLogo, removeLogo } = useTheme();
  const [selectedColor, setSelectedColor] = useState(themeConfig.primaryColor);
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(DEFAULT_PRINTER_SETTINGS);
  const [systemPrinters, setSystemPrinters] = useState<Array<{ name: string; isDefault: boolean }>>([]);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [isSavingPrinter, setIsSavingPrinter] = useState(false);
  const [isTestPrinting, setIsTestPrinting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadPrinterSettings().then(setPrinterSettings);
  }, []);

  useEffect(() => {
    if (!isElectronEnvironment()) return;

    setIsLoadingPrinters(true);
    void listSystemPrinters()
      .then(setSystemPrinters)
      .catch((error) => {
        console.error(error);
        toast.error("No se pudieron listar las impresoras del sistema");
      })
      .finally(() => setIsLoadingPrinters(false));
  }, []);

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    updateTheme({ primaryColor: color });
    toast.success("Color principal actualizado");
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona un archivo de imagen");
      return;
    }

    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Formato no permitido. Use PNG, JPEG o WebP.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("El logo no puede superar 2 MB");
      return;
    }

    try {
      await uploadLogo(file);
      toast.success("Logo actualizado exitosamente");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Error al subir el logo");
    }
  };

  const updatePrinterField = <K extends keyof PrinterSettings>(key: K, value: PrinterSettings[K]) => {
    setPrinterSettings((current) => ({ ...current, [key]: value }));
  };

  const handleSavePrinterSettings = async () => {
    setIsSavingPrinter(true);
    try {
      const saved = await savePrinterSettings(printerSettings);
      setPrinterSettings(saved);
      toast.success("Configuración de impresora guardada para esta caja");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la impresora");
    } finally {
      setIsSavingPrinter(false);
    }
  };

  const handleTestPrint = async () => {
    setIsTestPrinting(true);
    try {
      await savePrinterSettings(printerSettings);
      await printReceipt({
        items: [{ name: "Prueba de impresión", quantity: 1, price: 1 }],
        total: 1,
        subtotal: 1,
        businessName: "Mi Negocio",
        logoUrl: themeConfig.logoUrl,
        receiptWidthMm: themeConfig.receiptWidthMm ?? 80,
        voucherType: "comprobante",
        ticketId: "TEST-PRINT",
        payments: [{ type: "cash", amount: 1, label: "Efectivo" }],
      });
      toast.success("Ticket de prueba enviado a la impresora");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo imprimir la prueba";
      console.error("[print] prueba fallida:", error);
      toast.error(message, { duration: 8000 });
    } finally {
      setIsTestPrinting(false);
    }
  };

  const presetColors = [
    { name: "Negro", value: "#030213" },
    { name: "Azul", value: "#3b82f6" },
    { name: "Verde", value: "#10b981" },
    { name: "Rojo", value: "#ef4444" },
    { name: "Morado", value: "#8b5cf6" },
    { name: "Naranja", value: "#f97316" },
  ];

  const selectedPrinterValue = printerSettings.printerName ?? "__default__";

  return (
    <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo del Negocio</CardTitle>
              <CardDescription>
                Sube el logo que aparecerá en la parte superior del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-2 p-4 bg-muted rounded-lg">
                <img
                  src={themeConfig.logoUrl}
                  alt="Logo"
                  className="max-h-24 object-contain"
                />
                {!themeConfig.customLogoUrl && (
                  <p className="text-sm text-muted-foreground">Logo por defecto del sistema</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  id="appearance-logo-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoUpload}
                  className="sr-only"
                  aria-label="Seleccionar imagen de logo"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-4 mr-2" />
                  {themeConfig.customLogoUrl ? "Cambiar Logo" : "Subir Logo"}
                </Button>
                {themeConfig.customLogoUrl && (
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await removeLogo();
                        toast.success("Logo eliminado");
                      } catch {
                        toast.error("No se pudo eliminar el logo");
                      }
                    }}
                  >
                    Quitar Logo
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="size-5" />
                Impresora de esta caja
              </CardTitle>
              <CardDescription>
                La configuración se guarda en esta instalación (cada PC de mostrador tiene la suya).
                En el navegador de desarrollo solo podés ver la vista previa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="mb-2 block">Ancho del papel térmico</Label>
                <div className="flex flex-wrap gap-3">
                  {([55, 80] as const).map((width) => (
                    <Button
                      key={width}
                      type="button"
                      variant={themeConfig.receiptWidthMm === width ? "default" : "outline"}
                      onClick={() => {
                        updateTheme({ receiptWidthMm: width });
                        toast.success(`Ancho de ticket: ${width} mm`);
                      }}
                    >
                      {width} mm
                    </Button>
                  ))}
                </div>
              </div>

              {isElectronEnvironment() ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Impresora del sistema</Label>
                    <Select
                      value={selectedPrinterValue}
                      onValueChange={(value) =>
                        updatePrinterField("printerName", value === "__default__" ? null : value)
                      }
                      disabled={isLoadingPrinters}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingPrinters ? "Cargando..." : "Seleccionar impresora"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Predeterminada de Windows</SelectItem>
                        {systemPrinters.map((printer) => (
                          <SelectItem key={printer.name} value={printer.name}>
                            {printer.name}
                            {printer.isDefault ? " (predeterminada)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Modo de impresión</Label>
                    <Select
                      value={printerSettings.printMode}
                      onValueChange={(value: "escpos" | "html") => updatePrinterField("printMode", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="escpos">ESC/POS directo (recomendado)</SelectItem>
                        <SelectItem value="html">Driver del sistema (HTML)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Marca / driver térmico</Label>
                    <Select
                      value={printerSettings.printerType}
                      onValueChange={(value: PrinterType) => updatePrinterField("printerType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRINTER_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                    <div>
                      <p className="text-sm font-medium">Impresión silenciosa</p>
                      <p className="text-xs text-muted-foreground">
                        Sin diálogo de impresión (solo modo HTML / driver)
                      </p>
                    </div>
                    <Switch
                      checked={printerSettings.printSilent}
                      onCheckedChange={(checked) => updatePrinterField("printSilent", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                    <div>
                      <p className="text-sm font-medium">Respaldo HTML si falla ESC/POS</p>
                      <p className="text-xs text-muted-foreground">
                        Intenta imprimir por el driver de Windows si la térmica no responde
                      </p>
                    </div>
                    <Switch
                      checked={printerSettings.fallbackHtml}
                      onCheckedChange={(checked) => updatePrinterField("fallbackHtml", checked)}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground rounded-lg border p-3">
                  Para elegir impresora y modo ESC/POS, abrí el instalador de escritorio (`.exe`) en la caja.
                </p>
              )}

              <div className="flex flex-wrap gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    previewReceiptText({
                      items: [
                        { name: "Café Espresso", quantity: 2, price: 2.5 },
                        { name: "Medialuna", quantity: 1, price: 0.8 },
                      ],
                      total: 5.8,
                      subtotal: 5.8,
                      businessName: "Mi Negocio",
                      receiptWidthMm: themeConfig.receiptWidthMm ?? 80,
                      voucherType: "comprobante",
                      ticketId: "DEMO-TEXT",
                      payments: [{ type: "cash", amount: 5.8, label: "Efectivo" }],
                    });
                  }}
                >
                  <Eye className="size-4 mr-2" />
                  Vista previa texto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleTestPrint()}
                  disabled={!isElectronEnvironment() || isTestPrinting}
                >
                  <Printer className="size-4 mr-2" />
                  {isTestPrinting ? "Imprimiendo..." : "Imprimir prueba"}
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSavePrinterSettings()}
                  disabled={isSavingPrinter}
                >
                  {isSavingPrinter ? "Guardando..." : "Guardar impresora"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="size-5" />
                Vista previa del ticket
              </CardTitle>
              <CardDescription>
                Ejemplo con el ancho seleccionado ({themeConfig.receiptWidthMm ?? 80} mm)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-white p-4 overflow-auto max-h-80">
                <iframe
                  title="Vista previa ticket"
                  className="mx-auto border-0"
                  style={{ width: `${themeConfig.receiptWidthMm ?? 80}mm`, minHeight: "280px" }}
                  srcDoc={buildReceiptHtml(
                    [
                      { name: "Café Espresso", quantity: 2, price: 2.5 },
                      { name: "Medialuna", quantity: 1, price: 0.8 },
                    ],
                    5.8,
                    {
                      widthMm: themeConfig.receiptWidthMm ?? 80,
                      businessName: "Mi Negocio",
                      logoUrl: themeConfig.logoUrl,
                      voucherType: "comprobante",
                      ticketId: "DEMO-001",
                      payments: [{ type: "cash", amount: 5.8, label: "Efectivo" }],
                      subtotal: 5.8,
                    },
                  )}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  openReceiptPreview(
                    buildReceiptHtml(
                      [
                        { name: "Café Espresso", quantity: 2, price: 2500 },
                        { name: "Medialuna", quantity: 1, price: 800 },
                      ],
                      5800,
                      {
                        widthMm: themeConfig.receiptWidthMm ?? 80,
                        businessName: "Mi Negocio",
                        logoUrl: themeConfig.logoUrl,
                        voucherType: "comprobante",
                        ticketId: "DEMO-001",
                        subtotal: 5800,
                      },
                    ),
                  );
                }}
              >
                <Eye className="size-4 mr-2" />
                Abrir en ventana nueva
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Color Principal</CardTitle>
              <CardDescription>
                Selecciona el color que se usará en botones y elementos destacados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="appearance-primary-color">Selector de Color</Label>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    id="appearance-primary-color"
                    type="color"
                    aria-label="Selector de color principal"
                    value={selectedColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="h-14 w-20 rounded-lg cursor-pointer border-2"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{selectedColor}</p>
                    <p className="text-sm text-muted-foreground">
                      Color actual seleccionado
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label>Colores Predefinidos</Label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-2">
                  {presetColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => handleColorChange(color.value)}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg border-2 hover:bg-muted transition-colors"
                      style={{
                        borderColor:
                          selectedColor === color.value
                            ? color.value
                            : "transparent",
                      }}
                    >
                      <div
                        className="size-10 rounded-full border-2"
                        style={{ backgroundColor: color.value }}
                      />
                      <span className="text-xs font-medium">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-3">Vista Previa</p>
                <div className="flex gap-2">
                  <Button style={{ backgroundColor: selectedColor }}>
                    Botón de Ejemplo
                  </Button>
                  <Button
                    variant="outline"
                    style={{ borderColor: selectedColor, color: selectedColor }}
                  >
                    Botón Secundario
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
    </div>
  );
}
