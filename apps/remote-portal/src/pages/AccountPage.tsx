import { FormEvent, useEffect, useState } from 'react';
import { Bell, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  changePortalPassword,
  formatDateTime,
  getTenantMessages,
  markTenantMessageRead,
} from '@/lib/remote-api';
export function AccountPage() {
  const { session } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [messages, setMessages] = useState<Awaited<ReturnType<typeof getTenantMessages>>['messages']>([]);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  async function loadMessages() {
    if (!session?.sessionToken) {
      return;
    }

    try {
      const data = await getTenantMessages(session.sessionToken);
      setMessages(data.messages);
      setMessagesError(null);
    } catch (error) {
      setMessagesError(error instanceof Error ? error.message : 'No se pudieron cargar los mensajes');
    }
  }

  useEffect(() => {
    void loadMessages();
  }, [session?.sessionToken]);

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas nuevas no coinciden');
      return;
    }

    if (!session?.sessionToken) {
      return;
    }

    setIsSavingPassword(true);

    try {
      const result = await changePortalPassword(session.sessionToken, currentPassword, newPassword);
      setPasswordMessage(result.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'No se pudo cambiar la contraseña');
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleMarkRead(messageId: string) {
    if (!session?.sessionToken) {
      return;
    }

    await markTenantMessageRead(session.sessionToken, messageId);
    await loadMessages();
  }

  const unreadCount = messages.filter((message) => !message.readAt).length;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Mi cuenta</h2>
        <p className="text-sm text-slate-400">
          {session?.email} · {session?.clientNumber}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <h3 className="mb-4 inline-flex items-center gap-2 font-medium">
          <Bell className="h-4 w-4 text-teal-300" />
          Mensajes del equipo
          {unreadCount > 0 ? (
            <span className="rounded-full bg-teal-600 px-2 py-0.5 text-xs">{unreadCount} nuevo(s)</span>
          ) : null}
        </h3>

        {messagesError ? <p className="mb-3 text-sm text-rose-300">{messagesError}</p> : null}

        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">No tenés mensajes por ahora.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-xl border px-4 py-3 ${
                  message.readAt ? 'border-white/5 bg-slate-950/40' : 'border-teal-500/30 bg-teal-500/10'
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-400">
                  <span>De: {message.fromEmail}</span>
                  <span>{formatDateTime(message.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-200">{message.body}</p>
                {!message.readAt ? (
                  <button
                    type="button"
                    onClick={() => void handleMarkRead(message.id)}
                    className="mt-2 text-xs text-teal-300 hover:underline"
                  >
                    Marcar como leído
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(event) => void handleChangePassword(event)}
        className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"
      >
        <h3 className="mb-4 inline-flex items-center gap-2 font-medium">
          <Lock className="h-4 w-4 text-teal-300" />
          Cambiar contraseña
        </h3>

        {passwordMessage ? <p className="mb-3 text-sm text-teal-200">{passwordMessage}</p> : null}
        {passwordError ? <p className="mb-3 text-sm text-rose-300">{passwordError}</p> : null}

        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
            placeholder="Contraseña actual"
            required
          />
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
            placeholder="Nueva contraseña"
            minLength={6}
            required
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
            placeholder="Confirmar nueva"
            minLength={6}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSavingPassword}
          className="mt-4 rounded-xl bg-teal-600 px-4 py-3 font-medium hover:bg-teal-500 disabled:opacity-60"
        >
          {isSavingPassword ? 'Guardando…' : 'Actualizar contraseña'}
        </button>
      </form>
    </section>
  );
}
