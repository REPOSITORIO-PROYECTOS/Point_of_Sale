import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
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
} from "../ui/dialog";
import { mockUserRoles, type UserRole } from "../../../lib/mock-data";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  Eye,
  Edit,
  DollarSign,
  XCircle,
  PercentCircle,
  FileText,
} from "lucide-react";

export function UserRolesSettings() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [roles] = useState<UserRole[]>(mockUserRoles);

  const getRoleIcon = (accessLevel: string) => {
    switch (accessLevel) {
      case "admin":
        return <ShieldAlert className="size-5 text-red-600" />;
      case "manager":
        return <ShieldCheck className="size-5 text-blue-600" />;
      case "cashier":
        return <User className="size-5 text-green-600" />;
      case "auditor":
        return <Shield className="size-5 text-purple-600" />;
      default:
        return <User className="size-5" />;
    }
  };

  const getRoleBadgeVariant = (accessLevel: string) => {
    switch (accessLevel) {
      case "admin":
        return "destructive";
      case "manager":
        return "default";
      case "cashier":
        return "secondary";
      case "auditor":
        return "outline";
      default:
        return "secondary";
    }
  };

  const permissionLabels: Record<keyof UserRole["permissions"], string> = {
    canViewAudit: "Ver auditorías",
    canEditProducts: "Editar productos",
    canManageCash: "Gestionar caja",
    canCancelSales: "Cancelar ventas",
    canApplyDiscounts: "Aplicar descuentos",
    canAccessReports: "Acceder a reportes",
  };

  const permissionIcons: Record<keyof UserRole["permissions"], any> = {
    canViewAudit: Eye,
    canEditProducts: Edit,
    canManageCash: DollarSign,
    canCancelSales: XCircle,
    canApplyDiscounts: PercentCircle,
    canAccessReports: FileText,
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Roles y Permisos</h3>
          <p className="text-sm text-muted-foreground">
            Configura los niveles de acceso y permisos para cada rol de usuario
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => (
            <Card
              key={role.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelectedRole(role)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(role.accessLevel)}
                    <h4 className="font-semibold">{role.name}</h4>
                  </div>
                  <Badge variant={getRoleBadgeVariant(role.accessLevel) as any}>
                    {role.accessLevel}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(role.permissions).map(([key, value]) => {
                    const Icon =
                      permissionIcons[key as keyof UserRole["permissions"]];
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {
                              permissionLabels[
                                key as keyof UserRole["permissions"]
                              ]
                            }
                          </span>
                        </div>
                        <Badge
                          variant={value ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {value ? "Sí" : "No"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <div className="flex items-start gap-3">
              <Shield className="size-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900">
                  Niveles de Acceso
                </h4>
                <CardDescription className="text-blue-700 mt-1">
                  <ul className="space-y-1 text-sm">
                    <li>
                      • <strong>Administrador:</strong> Acceso total al sistema
                    </li>
                    <li>
                      • <strong>Gerente:</strong> Gestión completa con
                      supervisión
                    </li>
                    <li>
                      • <strong>Cajero:</strong> Operaciones de venta y caja
                    </li>
                    <li>
                      • <strong>Auditor:</strong> Solo lectura y reportes
                    </li>
                  </ul>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Modal de Detalle del Rol */}
      <Dialog
        open={!!selectedRole}
        onOpenChange={(open) => !open && setSelectedRole(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRole && getRoleIcon(selectedRole.accessLevel)}
              {selectedRole?.name}
            </DialogTitle>
            <DialogDescription>
              Gestiona los permisos y configuraciones para este rol
            </DialogDescription>
          </DialogHeader>

          {selectedRole && (
            <div className="space-y-6 py-4">
              <div>
                <Label className="text-base mb-4 block">Permisos</Label>
                <div className="space-y-3">
                  {Object.entries(selectedRole.permissions).map(
                    ([key, value]) => {
                      const Icon =
                        permissionIcons[key as keyof UserRole["permissions"]];
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="size-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {
                                  permissionLabels[
                                    key as keyof UserRole["permissions"]
                                  ]
                                }
                              </p>
                            </div>
                          </div>
                          <Switch checked={value} disabled />
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSelectedRole(null)}
                >
                  Cerrar
                </Button>
                <Button>Guardar Cambios</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
