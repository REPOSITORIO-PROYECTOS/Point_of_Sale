import { useState } from "react";
import { useAuth } from "../../../lib/auth-context";
import { useTheme } from "../../../lib/theme-context";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  ShoppingCart,
  User,
  Store,
  Palette,
  DollarSign,
  Package,
  LogOut,
  Bell,
  FileSpreadsheet,
  ClipboardList,
  Shield,
  FileKey,
} from "lucide-react";
import { AppearanceSettings } from "../settings/AppearanceSettings";
import { AfipCredentialsSettings } from "../settings/AfipCredentialsSettings";
import { UserRolesSettings } from "../settings/UserRolesSettings";
import { UserProfileSettings } from "../settings/UserProfileSettings";
import { getRoleLabel } from "../../../lib/user-roles";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const { user, logout, isAdmin } = useAuth();
  const { themeConfig } = useTheme();
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [businessOpen, setBusinessOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [afipOpen, setAfipOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const navigationItems = [
    { id: "pos", label: "Mostrador", icon: ShoppingCart },
    ...(isAdmin ? [{ id: "parcels", label: "Encomiendas", icon: Package }] : []),
  ];

  return (
    <>
      <header className="border-b bg-primary text-primary-foreground">
        <div className="px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo y nombre */}
          <div className="flex items-center gap-4">
            <img
              src={themeConfig.logoUrl}
              alt="Logo"
              className="h-12 object-contain cursor-pointer"
              onClick={() => onTabChange("pos")}
            />
            <div>
              <h1 className="text-xl font-bold">Sistema Punto de Venta</h1>
              <p className="text-xs opacity-75">Gestión de Ventas</p>
            </div>
          </div>

          {/* Navegación central */}
          <nav className="flex-1 flex justify-center gap-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "secondary" : "ghost"}
                  className={`h-11 px-6 gap-2 ${
                    activeTab === item.id
                      ? "bg-primary-foreground text-primary"
                      : "text-primary-foreground hover:bg-primary-foreground/10"
                  }`}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon className="size-5" />
                  {item.label}
                </Button>
              );
            })}

            {/* Inventario */}
            {isAdmin && (
              <Button
                variant={activeTab === "inventory" ? "secondary" : "ghost"}
                className={`h-11 px-6 gap-2 ${
                  activeTab === "inventory"
                    ? "bg-primary-foreground text-primary"
                    : "text-primary-foreground hover:bg-primary-foreground/10"
                }`}
                onClick={() => onTabChange("inventory")}
              >
                <FileSpreadsheet className="size-5" />
                Inventario
              </Button>
            )}

            {/* Auditoría */}
            {isAdmin && (
              <Button
                variant={activeTab === "audit" ? "secondary" : "ghost"}
                className={`h-11 px-6 gap-2 ${
                  activeTab === "audit"
                    ? "bg-primary-foreground text-primary"
                    : "text-primary-foreground hover:bg-primary-foreground/10"
                }`}
                onClick={() => onTabChange("audit")}
              >
                <ClipboardList className="size-5" />
                Auditoría
              </Button>
            )}
          </nav>

          {/* Acciones del usuario */}
          <div className="flex items-center gap-2">
            {/* Notificaciones */}
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Bell className="size-5" />
            </Button>

            {/* Configuración de Negocio */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <Store className="size-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Configuración de Negocio</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setAppearanceOpen(true)}>
                    <Palette className="size-4 mr-2" />
                    Apariencia y Logo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setBusinessOpen(true)}>
                    <Store className="size-4 mr-2" />
                    Datos del Negocio
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRolesOpen(true)}>
                    <Shield className="size-4 mr-2" />
                    Roles y Permisos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAfipOpen(true)}>
                    <FileKey className="size-4 mr-2" />
                    Certificados AFIP
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Usuario */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-11 gap-2 text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <div className="size-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    <User className="size-5" />
                  </div>
                  <div className="text-left hidden md:block">
                    <p className="text-sm font-medium">
                      {user ? getRoleLabel(user.role) : ""}
                    </p>
                    <p className="text-xs opacity-75">{user?.username}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  <User className="size-4 mr-2" />
                  Perfil de Usuario
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={logout}>
                  <LogOut className="size-4 mr-2" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Modal de Apariencia */}
      <Dialog open={appearanceOpen} onOpenChange={setAppearanceOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Configuración de Apariencia</DialogTitle>
            <DialogDescription>
              Personaliza los colores y el logo de tu negocio
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[calc(85vh-8rem)]">
            <AppearanceSettings />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Roles y Permisos */}
      <Dialog open={rolesOpen} onOpenChange={setRolesOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Roles y Permisos de Usuario</DialogTitle>
            <DialogDescription>
              Gestiona los niveles de acceso y permisos del sistema
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[calc(85vh-8rem)]">
            <UserRolesSettings />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Certificados AFIP */}
      <Dialog open={afipOpen} onOpenChange={setAfipOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Certificados AFIP</DialogTitle>
            <DialogDescription>
              Generá la clave y CSR, subilo a AFIP y después importá el certificado aprobado
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[calc(85vh-8rem)]">
            <AfipCredentialsSettings />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Datos del Negocio */}
      <Dialog open={businessOpen} onOpenChange={setBusinessOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Datos del Negocio</DialogTitle>
            <DialogDescription>
              Configura la información de tu negocio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre del Negocio</Label>
                <Input
                  type="text"
                  placeholder="Mi Negocio"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>RUT / CUIT</Label>
                <Input
                  type="text"
                  placeholder="12-34567890-1"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input
                  type="tel"
                  placeholder="+54 11 1234-5678"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="contacto@negocio.com"
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label>Dirección</Label>
                <Input
                  type="text"
                  placeholder="Calle 123, Ciudad"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setBusinessOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setBusinessOpen(false)}>
                Guardar Cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Perfil de Usuario */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Perfil de Usuario</DialogTitle>
            <DialogDescription>
              Administrá tu cuenta, contraseña y preferencias personales
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[calc(85vh-8rem)]">
            <UserProfileSettings />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
