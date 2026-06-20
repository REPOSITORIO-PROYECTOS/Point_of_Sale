import { useState } from "react";
import { useAuth } from "../../../lib/auth-context";
import { useTheme } from "../../../lib/theme-context";
import { Button } from "../ui/button";
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
  Settings,
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
  Cloud,
} from "lucide-react";
import { AppearanceSettings } from "../settings/AppearanceSettings";
import { AfipCredentialsSettings } from "../settings/AfipCredentialsSettings";
import { BusinessSettings } from "../settings/BusinessSettings";
import { RemoteSettings } from "../settings/RemoteSettings";
import { UserRolesSettings } from "../settings/UserRolesSettings";
import { useBusinessSettings } from "../../../lib/business-settings-context";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const { user, logout, isAdmin } = useAuth();
  const { settings: businessSettings } = useBusinessSettings();
  const { themeConfig } = useTheme();
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [businessOpen, setBusinessOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [afipOpen, setAfipOpen] = useState(false);
  const [remoteOpen, setRemoteOpen] = useState(false);

  const navigationItems = [
    { id: "pos", label: "Mostrador", icon: ShoppingCart },
    ...(isAdmin && businessSettings.parcelsEnabled
      ? [{ id: "parcels", label: "Encomiendas", icon: Package }]
      : []),
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
                  <DropdownMenuItem onClick={() => setRemoteOpen(true)}>
                    <Cloud className="size-4 mr-2" />
                    Conexión Remota
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="size-4 mr-2" />
                    Configuración General
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
                      {user?.role === "admin" ? "Administrador" : "Cajero"}
                    </p>
                    <p className="text-xs opacity-75">{user?.username}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="size-4 mr-2" />
                  Perfil de Usuario
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="size-4 mr-2" />
                  Preferencias
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
              Importá CUIT, certificado y clave privada para facturación electrónica
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[calc(85vh-8rem)]">
            <AfipCredentialsSettings />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Conexión Remota */}
      <Dialog open={remoteOpen} onOpenChange={setRemoteOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Conexión Remota</DialogTitle>
            <DialogDescription>
              Emparejá esta caja con el portal POS Remoto para supervisión a distancia
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[calc(85vh-8rem)]">
            <RemoteSettings />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Datos del Negocio */}
      <Dialog open={businessOpen} onOpenChange={setBusinessOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Datos del Negocio</DialogTitle>
            <DialogDescription>
              Información del local y módulos activos (encomiendas, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[calc(85vh-8rem)]">
            <BusinessSettings onSaved={() => setBusinessOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
