import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { PosAPI } from "../../../lib/pos-api";
import { ShieldAlert, User, UserPlus } from "lucide-react";
import { toast } from "sonner";

type ApiUser = {
  id: string;
  username: string;
  role: "admin" | "cashier";
  isActive: boolean;
  createdAt: string;
};

export function UserRolesSettings() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "cashier">("cashier");
  const [isCreating, setIsCreating] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const data = await PosAPI.getUsers();
      setUsers(data);
    } catch (error) {
      toast.error("No se pudieron cargar los usuarios");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleToggleActive = async (user: ApiUser, isActive: boolean) => {
    try {
      const updated = await PosAPI.updateUserActive(user.id, isActive);
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      toast.success(`Usuario ${updated.username} ${isActive ? "habilitado" : "deshabilitado"}`);
    } catch (error) {
      toast.error("No se pudo actualizar el usuario");
      console.error(error);
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername.trim() || newPassword.length < 6) {
      toast.error("Usuario (mín. 3) y contraseña (mín. 6) requeridos");
      return;
    }

    setIsCreating(true);
    try {
      const created = await PosAPI.createUser(newUsername.trim(), newPassword, newRole);
      setUsers((current) => [...current, created].sort((a, b) => a.username.localeCompare(b.username)));
      setNewUsername("");
      setNewPassword("");
      setNewRole("cashier");
      toast.success(`Usuario ${created.username} creado`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el usuario");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Usuarios del sistema</h3>
        <p className="text-sm text-muted-foreground">
          Usuarios reales persistidos en SQLite. La deshabilitación remota vía portal usa el mismo
          endpoint cuando el agente remoto esté emparejado.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-4" />
            Crear usuario
          </CardTitle>
          <CardDescription>Agregá cajeros o administradores al POS local</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="newUsername">Usuario</Label>
            <Input
              id="newUsername"
              value={newUsername}
              onChange={(event) => setNewUsername(event.target.value)}
              placeholder="cajero2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Contraseña</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="mínimo 6 caracteres"
            />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={newRole} onValueChange={(value: "admin" | "cashier") => setNewRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cashier">Cajero</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={() => void handleCreateUser()} disabled={isCreating} className="w-full">
              {isCreating ? "Creando…" : "Crear usuario"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cuentas locales</CardTitle>
          <CardDescription>Roles disponibles: admin y cashier</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Activo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Cargando usuarios...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No hay usuarios registrados
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "destructive" : "secondary"}>
                        {user.role === "admin" ? (
                          <ShieldAlert className="size-3 mr-1 inline" />
                        ) : (
                          <User className="size-3 mr-1 inline" />
                        )}
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "outline"}>
                        {user.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={user.isActive}
                        onCheckedChange={(checked) => void handleToggleActive(user, checked)}
                        aria-label={`Activar ${user.username}`}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
