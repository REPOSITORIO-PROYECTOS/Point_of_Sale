import { useState, useCallback } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Package } from "lucide-react";
import { toast } from "sonner";
import { WailsAPI } from "../../../lib/wails-bridge";
import { ProductsManagementView } from "./ProductsManagementView";

interface PreviewData {
  headers: string[];
  rows: any[][];
}

interface ColumnMapping {
  [key: string]: string;
}

const systemColumns = [
  { value: "id", label: "ID / Código de Barras" },
  { value: "name", label: "Nombre del Producto" },
  { value: "price", label: "Precio" },
  { value: "categories", label: "Categorías (separadas por coma)" },
  { value: "stock", label: "Stock Disponible" },
  { value: "skip", label: "Ignorar Columna" },
];

export function ImportExportView() {
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const fileExtension = file.name.substring(file.name.lastIndexOf("."));

    if (!validExtensions.includes(fileExtension.toLowerCase())) {
      toast.error("Formato no válido. Solo se aceptan archivos CSV o Excel (.xlsx, .xls)");
      return;
    }

    // Simulación de lectura de archivo
    toast.info("Procesando archivo...");

    setTimeout(() => {
      // Datos de ejemplo para previsualización
      const mockData: PreviewData = {
        headers: ["Código", "Producto", "Precio Unit.", "Categoría", "Stock"],
        rows: [
          ["001", "Café Espresso", "2.50", "Bebidas", "100"],
          ["002", "Capuchino", "3.50", "Bebidas", "85"],
          ["003", "Croissant", "3.00", "Panadería", "50"],
          ["004", "Jugo de Naranja", "3.50", "Bebidas", "40"],
          ["005", "Sándwich Mixto", "6.50", "Comida", "30"],
        ],
      };

      setPreviewData(mockData);

      // Auto-mapeo inteligente
      const autoMapping: ColumnMapping = {};
      mockData.headers.forEach((header, index) => {
        const headerLower = header.toLowerCase();
        if (headerLower.includes("código") || headerLower.includes("cod") || headerLower.includes("id")) {
          autoMapping[index] = "id";
        } else if (headerLower.includes("producto") || headerLower.includes("nombre")) {
          autoMapping[index] = "name";
        } else if (headerLower.includes("precio")) {
          autoMapping[index] = "price";
        } else if (headerLower.includes("categoría") || headerLower.includes("categoria")) {
          autoMapping[index] = "categories";
        } else if (headerLower.includes("stock")) {
          autoMapping[index] = "stock";
        } else {
          autoMapping[index] = "skip";
        }
      });

      setColumnMapping(autoMapping);
      toast.success("Archivo cargado correctamente");
    }, 1000);
  };

  const handleExport = async () => {
    try {
      toast.info("Generando archivo CSV...");
      // Simular exportación
      setTimeout(() => {
        toast.success("Catálogo exportado exitosamente");
        // En producción, esto descargaría el archivo
      }, 1500);
    } catch (error) {
      toast.error("Error al exportar el catálogo");
    }
  };

  const handleDownloadTemplate = () => {
    toast.info("Descargando plantilla de ejemplo...");
    setTimeout(() => {
      toast.success("Plantilla descargada");
      // En producción, esto descargaría un archivo CSV de plantilla
    }, 500);
  };

  const handleImport = async () => {
    if (!previewData) {
      toast.error("No hay datos para importar");
      return;
    }

    // Validar que hay columnas mapeadas
    const mappedColumns = Object.values(columnMapping).filter(v => v !== "skip");
    if (mappedColumns.length === 0) {
      toast.error("Debes mapear al menos una columna");
      return;
    }

    setImporting(true);
    setProgress(0);

    // Simular importación con progreso
    const totalRows = previewData.rows.length;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setImporting(false);
            setProgress(0);
            setPreviewData(null);
            setColumnMapping({});
            toast.success(`Se importaron ${totalRows} artículos con éxito`);
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-6 border-b bg-background">
        <div className="flex items-center gap-3">
          <Package className="size-6" />
          <div>
            <h1 className="text-2xl font-semibold">Gestión de Inventario</h1>
            <p className="text-sm text-muted-foreground">
              Administra tu catálogo de productos
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="products" className="flex-1 flex flex-col min-h-0">
        <div className="px-6 pt-4 shrink-0">
          <TabsList>
            <TabsTrigger value="products">Productos</TabsTrigger>
            <TabsTrigger value="import-export">Importar / Exportar</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="products"
          className="flex-1 min-h-0 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <ProductsManagementView />
        </TabsContent>

        <TabsContent value="import-export" className="flex-1 min-h-0 overflow-auto p-6 m-0">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Acciones rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="size-5" />
                  Exportar Catálogo
                </CardTitle>
                <CardDescription>
                  Descarga tu catálogo completo en formato CSV
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleExport} className="w-full">
                  <Download className="size-4 mr-2" />
                  Exportar Catálogo Actual
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="size-5" />
                  Plantilla de Ejemplo
                </CardTitle>
                <CardDescription>
                  Descarga una plantilla con el formato correcto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleDownloadTemplate} variant="outline" className="w-full">
                  <Download className="size-4 mr-2" />
                  Descargar Plantilla
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Zona de Drop */}
          <Card>
            <CardHeader>
              <CardTitle>Importar Productos</CardTitle>
              <CardDescription>
                Arrastra un archivo CSV o Excel, o haz clic para seleccionar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
              >
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="size-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  {dragActive
                    ? "Suelta el archivo aquí"
                    : "Arrastra tu archivo aquí"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  o haz clic para seleccionar un archivo
                </p>
                <p className="text-xs text-muted-foreground">
                  Formatos soportados: CSV, XLSX, XLS
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Previsualización y Mapeo */}
          {previewData && !importing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="size-5 text-green-600" />
                  Previsualización y Mapeo de Columnas
                </CardTitle>
                <CardDescription>
                  Verifica que las columnas coincidan con tu sistema (mostrando primeros 5 registros)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selectores de mapeo */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted rounded-lg">
                  {previewData.headers.map((header, index) => (
                    <div key={index}>
                      <Label className="text-xs mb-2">
                        Columna: <strong>{header}</strong>
                      </Label>
                      <Select
                        value={columnMapping[index] || "skip"}
                        onValueChange={(value) =>
                          setColumnMapping({ ...columnMapping, [index]: value })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {systemColumns.map((col) => (
                            <SelectItem key={col.value} value={col.value}>
                              {col.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                {/* Tabla de previsualización */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {previewData.headers.map((header, index) => (
                          <TableHead key={index}>
                            {header}
                            <div className="text-xs text-muted-foreground mt-1">
                              →{" "}
                              {systemColumns.find((c) => c.value === columnMapping[index])
                                ?.label || "N/A"}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex}>{cell}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="size-4" />
                    <span>
                      Se procesarán <strong>{previewData.rows.length}</strong> productos
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPreviewData(null);
                        setColumnMapping({});
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleImport}>
                      <Upload className="size-4 mr-2" />
                      Procesar Importación Masiva
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Barra de progreso durante importación */}
          {importing && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Importando productos...</h3>
                    <span className="text-sm text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                  <p className="text-sm text-muted-foreground text-center">
                    Por favor espera mientras se procesan los productos
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
