import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../../lib/auth-context";
import { getRoleLabel } from "../../../lib/user-roles";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { KeyRound, User } from "lucide-react";

export function UserProfileSettings() {
  const { user, updateProfile } = useAuth();
  const [username, setUsername] = useState(user?.username ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  useEffect(() => {
    if (!user) return;
    setUsername(user.username);
  }, [user]);

  if (!user) {
    return null;
  }

  const handleAccountSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedUsername = username.trim();
    const usernameChanged = trimmedUsername !== user.username;
    const passwordChanged = newPassword.length > 0;

    if (!usernameChanged && !passwordChanged) {
      toast.info("No hay cambios para guardar");
      return;
    }

    if (passwordChanged) {
      if (!currentPassword) {
        toast.error("Ingresá la contraseña actual para cambiarla");
        return;
      }
      if (newPassword.length < 8) {
        toast.error("La nueva contraseña debe tener al menos 8 caracteres");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("Las contraseñas no coinciden");
        return;
      }
    }

    if (trimmedUsername.length < 3) {
      toast.error("El nombre de usuario debe tener al menos 3 caracteres");
      return;
    }

    setIsSavingAccount(true);

    try {
      await updateProfile({
        ...(usernameChanged ? { username: trimmedUsername } : {}),
        ...(passwordChanged
          ? {
              currentPassword,
              password: newPassword,
              confirmPassword,
            }
          : {}),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Perfil actualizado correctamente");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el perfil");
    } finally {
      setIsSavingAccount(false);
    }
  };

  return (
    <form onSubmit={handleAccountSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-5" />
            Datos de la cuenta
          </CardTitle>
          <CardDescription>
            Modificá tu nombre de usuario y revisá tu rol en el sistema. La impresora se configura en
            Apariencia y Logo (por caja).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="profile-username">Nombre de usuario</Label>
            <Input
              id="profile-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Rol</Label>
            <Input value={getRoleLabel(user.role)} disabled className="mt-1 bg-muted" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5" />
            Cambiar contraseña
          </CardTitle>
          <CardDescription>
            Completá estos campos solo si querés actualizar tu contraseña
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="profile-current-password">Contraseña actual</Label>
            <Input
              id="profile-current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              className="mt-1"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="profile-new-password">Nueva contraseña</Label>
              <Input
                id="profile-new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="profile-confirm-password">Confirmar contraseña</Label>
              <Input
                id="profile-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSavingAccount}>
          {isSavingAccount ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
