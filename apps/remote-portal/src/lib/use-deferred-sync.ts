import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { flushDeferredPriceIncreases } from '@/lib/deferred-sync';

export function useDeferredSync(): void {
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.sessionToken) {
      return;
    }

    const sync = () => {
      void flushDeferredPriceIncreases(session.sessionToken);
    };

    sync();

    window.addEventListener('online', sync);
    const interval = window.setInterval(sync, 60_000);

    return () => {
      window.removeEventListener('online', sync);
      window.clearInterval(interval);
    };
  }, [session?.sessionToken]);
}
