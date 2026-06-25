import { useState, useCallback, useRef } from "react";
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
import { ProductsManagementView } from "./ProductsManagementView";
import { StockMovementsView } from "./StockMovementsView";
import { PosAPI } from "../../../lib/pos-api";
import {
  autoMapColumns,
  buildProductsCsv,
  chunkArray,
  downloadImportTemplate,
  downloadTextFile,
  getPreviewRows,
  IMPORT_BATCH_SIZE,
  mapRowsToProducts,
  parseSpreadsheetFile,
  type ColumnMapping,
  type ImportField,
} from "../../../lib/product-import";

interface PreviewState {
  headers: string[];
  previewRows: string[][];
  totalRows: number;
}

const systemColumns: { value: ImportField; label: string }[] = [
  { value: "id", label: "Código / SKU" },
  { value: "name", label: "Nombre del Producto" },
  { value: "price", label: "Precio de venta" },
  { value: "cost", label: "Costo" },
  { value: "categories", label: "Categorías (separadas por coma)" },
  { value: "stock", label: "Stock" },
  { value: "barcode", label: "Código de Barras" },
  { value: "skip", label: "Ignorar columna" },
];

export function ImportExportView() {
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewState | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importStatus, setImportStatus] = useState("");
  const [skippedPreview, setSkippedPreview] = useState<string[]>([]);
  const allRowsRef = useRef<string[][]>([]);
  const [exporting, setExporting] = useState(false);

  const resetImportState = useCallback(() => {
    setPreviewData(null);
    setColumnMapping({});
    setSkippedPreview([]);
    allRowsRef.current = [];
  }, []);

  const processFile = useCallback(async (file: File) => {
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      toast.error("Formato no válido. Solo se aceptan archivos CSV o Excel (.xlsx, .xls)");
      return;
    }

    try {
      toast.info("Leyendo archivo...");
      const parsed = await parseSpreadsheetFile(file);

      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        toast.error("El archivo está vacío o no tiene filas de datos");
        return;
      }

      allRowsRef.current = parsed.rows;
      setPreviewData({
        headers: parsed.headers,
        previewRows: getPreviewRows(parsed.rows),
        totalRows: parsed.rows.length,
      });
      setColumnMapping(autoMapColumns(parsed.headers));
      setSkippedPreview([]);
      toast.success(`${parsed.rows.length} filas cargadas`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo leer el archivo";
      toast.error(message);
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        void processFile(files[0]);
      }
    },
    [processFile],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void processFile(e.target.files[0]);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      toast.info("Generando CSV del catálogo...");
      const products = await PosAPI.getProducts();
      const csv = buildProductsCsv(products);
      const date = new Date().toISOString().slice(0, 10);
      downloadTextFile(`catalogo_pos_${date}.csv`, csv, "text/csv;charset=utf-8");
      toast.success(`${products.length} productos exportados`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al exportar";
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadImportTemplate();
    toast.success("Plantilla descargada");
  };

  const handleImport = async () => {
    if (!previewData) {
      toast.error("No hay datos para importar");
      return;
    }

    const requiredFields: ImportField[] = ["id", "name", "price"];
    const mappedFields = new Set(Object.values(columnMapping).filter((value) => value !== "skip"));
    const missing = requiredFields.filter((field) => !mappedFields.has(field));

    if (missing.length > 0) {
      toast.error("Mapeá al menos Código, Nombre y Precio");
      return;
    }

    const { products, skipped } = mapRowsToProducts(allRowsRef.current, columnMapping);

    if (products.length === 0) {
      toast.error("Ninguna fila válida para importar. Revisá el mapeo de columnas.");
      if (skipped.length > 0) {
        setSkippedPreview(skipped.slice(0, 8).map((row) => `Fila ${row.rowIndex}: ${row.reason}`));
      }
      return;
    }

    setImporting(true);
    setProgress(0);
    setImportStatus("Preparando importación...");

    const batches = chunkArray(products, IMPORT_BATCH_SIZE);
    let imported = 0;

    try {
      for (let index = 0; index < batches.length; index += 1) {
        const batch = batches[index];
        setImportStatus(`Lote ${index + 1} de ${batches.length} (${batch.length} productos)...`);
        const result = await PosAPI.importBulkProducts(batch);
        imported += result.count;
        setProgress(Math.round(((index + 1) / batches.length) * 100));
      }

      setImportStatus("Importación completada");
      resetImportState();

      if (skipped.length > 0) {
        toast.warning(
          `Importados ${imported} productos. Omitidas ${skipped.length} filas (precio vacío, sin código, etc.).`,
        );
        setSkippedPreview(skipped.slice(0, 8).map((row) => `Fila ${row.rowIndex}: ${row.reason}`));
      } else {
        toast.success(`Se importaron ${imported} productos`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error durante la importación";
      toast.error(
        imported > 0
          ? `${message}. Se importaron ${imported} productos antes del error.`
          : message,
      );
    } finally {
      setImporting(false);
      setProgress(0);
      setImportStatus("");
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-6 border-b bg-background">
        <div className="flex items-center gap-3">
          <Package className="size-6" />
          <div>
            <h1 className="text-2xl font-semibold">Gestión de Inventario</h1>
            <p className="text-sm text-muted-foreground">
              Administra tu catálogo de productos y movimientos de stock
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="products" className="flex-1 flex flex-col min-h-0">
        <div className="px-6 pt-4 shrink-0">
          <TabsList>
            <TabsTrigger value="products">Productos</TabsTrigger>
            <TabsTrigger value="stock-movements">Stock</TabsTrigger>
            <TabsTrigger value="import-export">Importar / Exportar</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="products"
          className="flex-1 min-h-0 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <ProductsManagementView />
        </TabsContent>

        <TabsContent
          value="stock-movements"
          className="flex-1 min-h-0 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <StockMovementsView />
        </TabsContent>

        <TabsContent value="import-export" className="flex-1 min-h-0 overflow-auto p-6 m-0">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="size-5" />
                    Exportar Catálogo
                  </CardTitle>
                  <CardDescription>Descarga tu catálogo completo en formato CSV</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleExport} className="w-full" disabled={exporting}>
                    <Download className="size-4 mr-2" />
                    {exporting ? "Exportando..." : "Exportar Catálogo Actual"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="size-5" />
                    Plantilla de Ejemplo
                  </CardTitle>
                  <CardDescription>Descarga una plantilla con el formato correcto</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleDownloadTemplate} variant="outline" className="w-full">
                    <Download className="size-4 mr-2" />
                    Descargar Plantilla
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Importar Productos</CardTitle>
                <CardDescription>
                  Arrastra un archivo CSV o Excel. Se procesa en lotes de {IMPORT_BATCH_SIZE} por
                  request (una sola operación por lote, no fila por fila).
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
                    disabled={importing}
                    aria-label="Seleccionar archivo CSV o Excel para importar productos"
                  />
                  <Upload className="size-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    {dragActive ? "Suelta el archivo aquí" : "Arrastra tu archivo aquí"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    o haz clic para seleccionar un archivo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Formatos: CSV (separador ;), XLSX, XLS · hasta ~5.000+ filas
                  </p>
                </div>
              </CardContent>
            </Card>

            {skippedPreview.length > 0 && !importing && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium mb-2">Filas omitidas (muestra):</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {skippedPreview.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {previewData && !importing && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="size-5 text-green-600" />
                    Previsualización y Mapeo de Columnas
                  </CardTitle>
                  <CardDescription>
                    Verificá el mapeo (primeras {previewData.previewRows.length} filas de{" "}
                    {previewData.totalRows})
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 bg-muted rounded-lg">
                    {previewData.headers.map((header, index) => (
                      <div key={index}>
                        <Label className="text-xs mb-2">
                          Columna: <strong>{header}</strong>
                        </Label>
                        <Select
                          value={columnMapping[index] || "skip"}
                          onValueChange={(value) =>
                            setColumnMapping({ ...columnMapping, [index]: value as ImportField })
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

                  <div className="border rounded-lg overflow-auto max-h-80">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {previewData.headers.map((header, index) => (
                            <TableHead key={index}>
                              {header}
                              <div className="text-xs text-muted-foreground mt-1">
                                → {systemColumns.find((c) => c.value === columnMapping[index])?.label || "Ignorar"}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.previewRows.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <TableCell key={cellIndex} className="max-w-[200px] truncate">
                                {cell}
                              </TableCell>
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
                        Se procesarán hasta <strong>{previewData.totalRows}</strong> filas (
                        {Math.ceil(previewData.totalRows / IMPORT_BATCH_SIZE)} lotes)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={resetImportState}>
                        Cancelar
                      </Button>
                      <Button onClick={handleImport}>
                        <Upload className="size-4 mr-2" />
                        Importar catálogo
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {importing && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Importando productos...</h3>
                      <span className="text-sm text-muted-foreground">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <p className="text-sm text-muted-foreground text-center">{importStatus}</p>
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
