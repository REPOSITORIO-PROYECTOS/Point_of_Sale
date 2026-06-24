import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { PosAPI, type UserRole } from "../../../lib/pos-api";
import { useAuth } from "../../../lib/auth-context";
import {
  ACCESS_LEVEL_LABELS,
  ACCESS_LEVEL_SUMMARIES,
  getRoleLabel,
  ROLE_DEFINITIONS,
  type AccessLevel,
  type RoleDefinition,
} from "../../../lib/user-roles";
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
  UserPlus,
  KeyRound,
  Loader2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

type ManagedUser = {
  id: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
};

const ROLE_OPTIONS: AccessLevel[] = ["admin", "manager", "cashier", "auditor"];

function getRoleIcon(accessLevel: string) {
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
}

type RolePickerProps = {
  value: UserRole;
  onChange: (role: UserRole) => void;
};

function RolePicker({ value, onChange }: RolePickerProps) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Rol">
      {ROLE_OPTIONS.map((level) => {
        const isSelected = value === level;
        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={isSelected ? "true" : "false"}
            onClick={() => onChange(level)}
            className={`flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors ${
              isSelected
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="mt-0.5 shrink-0">{getRoleIcon(level)}</div>
            <div className="min-w-0">
              <p className="font-medium leading-tight">{ACCESS_LEVEL_LABELS[level]}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {ACCESS_LEVEL_SUMMARIES[level]}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function UserRolesSettings() {
  const { user: currentUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState<RoleDefinition | null>(null);
  const [roles] = useState<RoleDefinition[]>(ROLE_DEFINITIONS);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [createForm, setCreateForm] = useState({
    username: "",
    password: "",
    role: "cashier" as UserRole,
  });

  const [editForm, setEditForm] = useState({
    role: "cashier" as UserRole,
    password: "",
    isActive: true,
  });

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const data = await PosAPI.getUsers();
      setUsers(data);
    } catch {
      toast.error("No se pudieron cargar los usuarios");
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!editUser) return;
    setEditForm({
      role: editUser.role,
      password: "",
      isActive: editUser.isActive,
    });
  }, [editUser]);

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

  const permissionLabels: Record<keyof RoleDefinition["permissions"], string> = {
    canViewAudit: "Ver auditorías",
    canEditProducts: "Editar productos",
    canManageCash: "Gestionar caja",
    canCancelSales: "Cancelar ventas",
    canApplyDiscounts: "Aplicar descuentos",
    canAccessReports: "Acceder a reportes",
  };

  const permissionIcons: Record<keyof RoleDefinition["permissions"], typeof Eye> = {
    canViewAudit: Eye,
    canEditProducts: Edit,
    canManageCash: DollarSign,
    canCancelSales: XCircle,
    canApplyDiscounts: PercentCircle,
    canAccessReports: FileText,
  };

  const handleCreateUser = async () => {
    const username = createForm.username.trim();
    if (username.length < 3) {
      toast.error("El usuario debe tener al menos 3 caracteres");
      return;
    }
    if (createForm.password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setIsSaving(true);
    try {
      await PosAPI.createUser({
        username,
        password: createForm.password,
        role: createForm.role,
      });
      toast.success("Usuario creado correctamente");
      setCreateOpen(false);
      setCreateForm({ username: "", password: "", role: "cashier" });
      await loadUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear usuario";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editUser) return;

    if (editForm.password && editForm.password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setIsSaving(true);
    try {
      const payload: { isActive?: boolean; password?: string; role?: UserRole } = {
        isActive: editForm.isActive,
        role: editForm.role,
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password;
      }

      await PosAPI.updateUser(editUser.id, payload);
      toast.success("Usuario actualizado");
      setEditUser(null);
      await loadUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al actualizar usuario";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <>
      <div className="space-y-8">
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="size-5" />
                Cuentas de usuario
              </h3>
              <p className="text-sm text-muted-foreground">
                Creá usuarios, asigná roles y gestioná contraseñas y acceso
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="shrink-0">
              <UserPlus className="size-4 mr-2" />
              Nuevo usuario
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoadingUsers ? (
                <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Cargando usuarios...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Alta</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No hay usuarios registrados
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.username}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(account.role) as "default"}>
                              {getRoleLabel(account.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={account.isActive ? "default" : "secondary"}>
                              {account.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(account.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditUser(account)}
                            >
                              <KeyRound className="size-4 mr-1" />
                              Gestionar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Roles y Permisos</h3>
            <p className="text-sm text-muted-foreground">
              Referencia de niveles de acceso y permisos por rol
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
                    <Badge variant={getRoleBadgeVariant(role.accessLevel) as "default"}>
                      {role.accessLevel}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(role.permissions).map(([key, value]) => {
                      const Icon = permissionIcons[key as keyof RoleDefinition["permissions"]];
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="size-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {permissionLabels[key as keyof RoleDefinition["permissions"]]}
                            </span>
                          </div>
                          <Badge variant={value ? "default" : "secondary"} className="text-xs">
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
        </section>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5" />
              Nuevo usuario
            </DialogTitle>
            <DialogDescription>
              Creá una cuenta con usuario, contraseña y nivel de acceso
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-username">Usuario</Label>
              <Input
                id="new-username"
                value={createForm.username}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="ej: maria.gonzalez"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Contraseña</Label>
              <Input
                id="new-password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label>Rol</Label>
              <RolePicker
                value={createForm.role}
                onChange={(role) => setCreateForm((prev) => ({ ...prev, role }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={() => void handleCreateUser()} disabled={isSaving}>
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : "Crear usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5" />
              Gestionar usuario
            </DialogTitle>
            <DialogDescription>
              {editUser?.username} — cambiá rol, contraseña o estado de la cuenta
            </DialogDescription>
          </DialogHeader>

          {editUser && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Rol</Label>
                <RolePicker
                  value={editForm.role}
                  onChange={(role) => setEditForm((prev) => ({ ...prev, role }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-password">Nueva contraseña</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Dejar vacío para no cambiar"
                  autoComplete="new-password"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">Cuenta activa</p>
                  <p className="text-sm text-muted-foreground">
                    {editUser.id === currentUser?.id
                      ? "No podés desactivar tu propia sesión"
                      : "Los usuarios inactivos no pueden iniciar sesión"}
                  </p>
                </div>
                <Switch
                  checked={editForm.isActive}
                  disabled={editUser.id === currentUser?.id}
                  onCheckedChange={(checked) =>
                    setEditForm((prev) => ({ ...prev, isActive: checked }))
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={() => void handleUpdateUser()} disabled={isSaving}>
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              Permisos asignados a este rol (solo lectura)
            </DialogDescription>
          </DialogHeader>

          {selectedRole && (
            <div className="space-y-6 py-4">
              <div>
                <Label className="text-base mb-4 block">Permisos</Label>
                <div className="space-y-3">
                  {Object.entries(selectedRole.permissions).map(([key, value]) => {
                    const Icon = permissionIcons[key as keyof RoleDefinition["permissions"]];
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="size-5 text-muted-foreground" />
                          <p className="font-medium">
                            {permissionLabels[key as keyof RoleDefinition["permissions"]]}
                          </p>
                        </div>
                        <Switch checked={value} disabled />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedRole(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
