import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Circle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  createPortalWebSocket,
  formatRelativeTime,
  listRegisters,
  type TenantRegister,
} from '@/lib/remote-api';
import { cn } from '@/lib/utils';

export function DashboardPage() {
  const { session } = useAuth();
  const [registers, setRegisters] = useState<TenantRegister[]>([]);
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRegisters() {
    if (!session) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await listRegisters(session.clientNumber);
      setTenantName(data.name);
      setRegisters(data.registers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las cajas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRegisters();
  }, [session?.clientNumber]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const socket = createPortalWebSocket(session.clientNumber, (message) => {
      const payload = message as {
        type?: string;
        registers?: TenantRegister[];
        register?: TenantRegister;
      };

      if (payload.type === 'registers' && payload.registers) {
        setRegisters(payload.registers.map((register) => ({ ...register, paired: register.paired ?? true })));
      }

      if (payload.type === 'register_update' && payload.register) {
        setRegisters((current) =>
          current.map((register) =>
            register.id === payload.register?.id
              ? { ...register, ...payload.register, paired: register.paired }
              : register,
          ),
        );
      }
    });

    return () => socket.close();
  }, [session?.clientNumber]);

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Cajas asignadas</h2>
          <p className="text-sm text-slate-400">
            Cliente {session?.clientNumber} {tenantName ? `· ${tenantName}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadRegisters()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      {loading ? <p className="text-slate-400">Cargando cajas…</p> : null}
      {error ? <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

      {!loading && registers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-400">
          <p>No hay cajas registradas todavía.</p>
          <p className="mt-2 text-sm">Creá una caja en Asignar o emparejá desde el POS.</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {registers.map((register) => (
          <Link
            key={register.id}
            to={`/registers/${register.id}`}
            className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 transition hover:border-teal-500/40 hover:bg-slate-900"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-medium">{register.label}</h3>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
                  register.online ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-300',
                )}
              >
                <Circle className={cn('h-2 w-2 fill-current', register.online ? 'text-emerald-400' : 'text-slate-400')} />
                {register.online ? 'En línea' : 'Desconectada'}
              </span>
            </div>
            <p className="text-sm text-slate-400">Última señal: {formatRelativeTime(register.lastSeen)}</p>
            <p className="mt-1 text-xs text-slate-500">{register.paired ? 'Emparejada' : 'Pendiente de emparejar'}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
