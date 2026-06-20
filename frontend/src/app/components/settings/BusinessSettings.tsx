import { FormEvent, useEffect, useState } from "react";
import { Package } from "lucide-react";
import { useBusinessSettings } from "../../../lib/business-settings-context";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { toast } from "sonner";

type BusinessSettingsProps = {
  onSaved?: () => void;
};

export function BusinessSettings({ onSaved }: BusinessSettingsProps) {
  const { settings, updateSettings } = useBusinessSettings();
  const [businessName, setBusinessName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [parcelsEnabled, setParcelsEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setBusinessName(settings.businessName ?? "");
    setTaxId(settings.taxId ?? "");
    setPhone(settings.phone ?? "");
    setEmail(settings.email ?? "");
    setAddress(settings.address ?? "");
    setParcelsEnabled(settings.parcelsEnabled);
  }, [settings]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);

    try {
      await updateSettings({
        businessName: businessName.trim() || undefined,
        taxId: taxId.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        parcelsEnabled,
      });
      toast.success("Datos del negocio guardados");
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron guardar los datos");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6 py-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="business-name">Nombre del negocio</Label>
          <Input
            id="business-name"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder="Mi Negocio"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="business-tax-id">CUIT / RUT</Label>
          <Input
            id="business-tax-id"
            value={taxId}
            onChange={(event) => setTaxId(event.target.value)}
            placeholder="20-12345678-9"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="business-phone">Teléfono</Label>
          <Input
            id="business-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+54 11 1234-5678"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="business-email">Email</Label>
          <Input
            id="business-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="contacto@negocio.com"
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="business-address">Dirección</Label>
          <Input
            id="business-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Calle 123, Ciudad"
            className="mt-1"
          />
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium">
              <Package className="size-4 text-muted-foreground" />
              Gestión de encomiendas
            </div>
            <p className="text-sm text-muted-foreground">
              Activá esta opción si tu negocio retiene paquetes para clientes. Muestra la pestaña
              Encomiendas en el menú principal.
            </p>
          </div>
          <Switch
            checked={parcelsEnabled}
            onCheckedChange={setParcelsEnabled}
            aria-label="Activar gestión de encomiendas"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
