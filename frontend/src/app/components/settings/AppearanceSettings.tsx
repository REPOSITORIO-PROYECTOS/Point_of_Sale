import { useState, useRef } from "react";
import { useTheme } from "../../../lib/theme-context";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Upload } from "lucide-react";
import { toast } from "sonner";

export function AppearanceSettings() {
  const { themeConfig, updateTheme, uploadLogo, removeLogo } = useTheme();
  const [selectedColor, setSelectedColor] = useState(themeConfig.primaryColor);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const presetColors = [
    { name: "Negro", value: "#030213" },
    { name: "Azul", value: "#3b82f6" },
    { name: "Verde", value: "#10b981" },
    { name: "Rojo", value: "#ef4444" },
    { name: "Morado", value: "#8b5cf6" },
    { name: "Naranja", value: "#f97316" },
  ];

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
              {themeConfig.logoUrl && (
                <div className="flex justify-center p-4 bg-muted rounded-lg">
                  <img
                    src={themeConfig.logoUrl}
                    alt="Logo"
                    className="max-h-24 object-contain"
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-4 mr-2" />
                  {themeConfig.logoUrl ? "Cambiar Logo" : "Subir Logo"}
                </Button>
                {themeConfig.logoUrl && (
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
              <CardTitle>Impresión de tickets</CardTitle>
              <CardDescription>
                Ancho del papel térmico para el comprobante de venta (55 mm o 80 mm)
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {([55, 80] as const).map((width) => (
                <Button
                  key={width}
                  variant={themeConfig.receiptWidthMm === width ? "default" : "outline"}
                  onClick={() => {
                    updateTheme({ receiptWidthMm: width });
                    toast.success(`Ancho de ticket: ${width} mm`);
                  }}
                >
                  {width} mm
                </Button>
              ))}
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
                <Label>Selector de Color</Label>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="color"
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
