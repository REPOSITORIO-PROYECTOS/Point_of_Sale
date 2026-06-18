import { FormEvent, useState } from "react";
import { useAuth } from "../../../lib/auth-context";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ShieldCheck } from "lucide-react";

export function SetupView() {
  const { setupAdmin } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setIsSubmitting(true);

    try {
      await setupAdmin(username.trim(), password, confirmPassword);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "No se pudo crear el administrador";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto size-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="size-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Configuración inicial</CardTitle>
          <CardDescription>
            Es la primera vez que se inicia el sistema. Creá la cuenta de administrador. Este paso
            solo se puede hacer una vez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="setup-username">Usuario administrador</Label>
              <Input
                id="setup-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                autoFocus
                required
                minLength={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-password">Contraseña</Label>
              <Input
                id="setup-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-confirm-password">Confirmar contraseña</Label>
              <Input
                id="setup-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creando cuenta..." : "Crear administrador"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
