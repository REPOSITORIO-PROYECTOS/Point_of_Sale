import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { assignRegisters, createRegister, createTenant, listRegisters, type TenantRegister } from '@/lib/remote-api';

export function AssignRegistersPage() {
  const { session } = useAuth();
  const [registers, setRegisters] = useState<TenantRegister[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [registerLabel, setRegisterLabel] = useState('Caja 1');
  const [tenantName, setTenantName] = useState('Cliente demo');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!session?.clientNumber) {
      return;
    }

    const data = await listRegisters(session.clientNumber);
    setRegisters(data.registers);
    setSelectedIds(
      data.registers
        .filter((register) => register.assignedPortalUserIds.includes(session.portalUserId))
        .map((register) => register.id),
    );
  }

  useEffect(() => {
    void refresh().catch((refreshError) => {
      setError(refreshError instanceof Error ? refreshError.message : 'No se pudieron cargar las cajas');
    });
  }, [session?.clientNumber]);

  async function handleEnsureTenant(event: FormEvent) {
    event.preventDefault();
    if (!session?.clientNumber) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      await createTenant(session.clientNumber, tenantName);
      setMessage('Tenant creado correctamente.');
      await refresh();
    } catch (tenantError) {
      const text = tenantError instanceof Error ? tenantError.message : 'No se pudo crear el tenant';
      if (text.includes('already exists')) {
        setMessage('El tenant ya existía; podés crear cajas.');
      } else {
        setError(text);
      }
    }
  }

  async function handleCreateRegister(event: FormEvent) {
    event.preventDefault();
    if (!session?.clientNumber) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      await createRegister(session.clientNumber, registerLabel, [session.portalUserId]);
      setMessage(`Caja "${registerLabel}" creada.`);
      setRegisterLabel('');
      await refresh();
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : 'No se pudo crear la caja');
    }
  }

  async function handleAssign() {
    if (!session) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      await assignRegisters(selectedIds, session.portalUserId);
      setMessage('Asignación guardada.');
      await refresh();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : 'No se pudo guardar la asignación');
    }
  }

  function toggleRegister(registerId: string) {
    setSelectedIds((current) =>
      current.includes(registerId) ? current.filter((id) => id !== registerId) : [...current, registerId],
    );
  }

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Asignar cajas</h2>
        <p className="text-sm text-slate-400">Elegí qué cajas puede ver este usuario del portal.</p>
      </div>

      {message ? <p className="rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm text-teal-200">{message}</p> : null}
      {error ? <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

      <form onSubmit={handleEnsureTenant} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <h3 className="mb-3 font-medium">1. Crear tenant (solo dev)</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={tenantName}
            onChange={(event) => setTenantName(event.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
            placeholder="Nombre del cliente"
          />
          <button type="submit" className="rounded-xl bg-slate-800 px-4 py-3 hover:bg-slate-700">
            Crear tenant {session?.clientNumber}
          </button>
        </div>
      </form>

      <form onSubmit={handleCreateRegister} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <h3 className="mb-3 font-medium">2. Registrar caja</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={registerLabel}
            onChange={(event) => setRegisterLabel(event.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
            placeholder="Etiqueta de caja"
          />
          <button type="submit" className="rounded-xl bg-teal-700 px-4 py-3 hover:bg-teal-600">
            Agregar caja
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <h3 className="mb-3 font-medium">3. Asignar visibilidad</h3>
        <div className="space-y-3">
          {registers.map((register) => (
            <label key={register.id} className="flex items-center gap-3 rounded-xl border border-white/5 px-4 py-3">
              <input
                type="checkbox"
                checked={selectedIds.includes(register.id)}
                onChange={() => toggleRegister(register.id)}
              />
              <span>{register.label}</span>
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void handleAssign()}
          className="mt-4 rounded-xl bg-teal-600 px-4 py-3 font-medium hover:bg-teal-500"
        >
          Guardar asignación
        </button>
      </div>
    </section>
  );
}
