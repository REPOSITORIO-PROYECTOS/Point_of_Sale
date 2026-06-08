import { useState, useEffect } from "react";
import { Parcel, WailsAPI } from "../../../lib/wails-bridge";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Package, Plus } from "lucide-react";
import { toast } from "sonner";

export function ParcelsView() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    description: "",
    amount: "",
    status: "pending" as Parcel["status"],
  });

  useEffect(() => {
    loadParcels();
  }, []);

  const loadParcels = async () => {
    try {
      const data = await WailsAPI.getParcels();
      setParcels(data);
    } catch (error) {
      console.error("Failed to load parcels:", error);
      toast.error("Error al cargar encomiendas");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newParcel: Parcel = {
      id: Date.now().toString(),
      customerName: formData.customerName,
      description: formData.description,
      amount: parseFloat(formData.amount),
      status: formData.status,
      date: new Date().toISOString().split("T")[0],
    };

    try {
      await WailsAPI.saveParcel(newParcel);
      setParcels((prev) => [...prev, newParcel]);
      toast.success("Encomienda guardada exitosamente");
      setDialogOpen(false);
      setFormData({
        customerName: "",
        description: "",
        amount: "",
        status: "pending",
      });
    } catch (error) {
      console.error("Failed to save parcel:", error);
      toast.error("Error al guardar encomienda");
    }
  };

  const getStatusColor = (status: Parcel["status"]) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "picked-up":
        return "text-green-600 bg-green-50 border-green-200";
      case "returned":
        return "text-red-600 bg-red-50 border-red-200";
    }
  };

  const getStatusLabel = (status: Parcel["status"]) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "picked-up":
        return "Retirada";
      case "returned":
        return "Devuelta";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-pulse text-muted-foreground">
            Cargando encomiendas...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="size-6" />
            <div>
              <h1 className="text-2xl font-semibold">Gestión de Encomiendas</h1>
              <p className="text-sm text-muted-foreground">
                Registro de depósitos, retiros y pedidos especiales
              </p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="h-12">
                <Plus className="size-5 mr-2" />
                Nueva Encomienda
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Nueva Encomienda</DialogTitle>
                <DialogDescription>
                  Registrar un nuevo depósito o pedido especial
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="customerName">Nombre del Cliente</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) =>
                      setFormData({ ...formData, customerName: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Monto ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: Parcel["status"]) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="picked-up">Retirada</SelectItem>
                      <SelectItem value="returned">Devuelta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit">Guardar Encomienda</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {parcels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Package className="size-16 mb-4 opacity-20" />
            <p>No hay encomiendas registradas</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcels.map((parcel) => (
                <TableRow key={parcel.id}>
                  <TableCell>{parcel.date}</TableCell>
                  <TableCell className="font-medium">
                    {parcel.customerName}
                  </TableCell>
                  <TableCell>{parcel.description}</TableCell>
                  <TableCell>${parcel.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        parcel.status
                      )}`}
                    >
                      {getStatusLabel(parcel.status)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
