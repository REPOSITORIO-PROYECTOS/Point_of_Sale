import { useCallback, useEffect, useState } from 'react';
import { getHealth } from '@/lib/remote-api';

export type ConnectionStatus = {
  browserOnline: boolean;
  relayOnline: boolean;
  checking: boolean;
  lastCheckedAt?: string;
  relayError?: string;
};

export function useConnectionStatus(pollMs = 30_000): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>({
    browserOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    relayOnline: false,
    checking: true,
  });

  const checkRelay = useCallback(async () => {
    setStatus((current) => ({ ...current, checking: true }));

    try {
      await getHealth();
      setStatus({
        browserOnline: navigator.onLine,
        relayOnline: true,
        checking: false,
        lastCheckedAt: new Date().toISOString(),
      });
    } catch (error) {
      setStatus({
        browserOnline: navigator.onLine,
        relayOnline: false,
        checking: false,
        lastCheckedAt: new Date().toISOString(),
        relayError: error instanceof Error ? error.message : 'Relay offline',
      });
    }
  }, []);

  useEffect(() => {
    void checkRelay();

    const interval = window.setInterval(() => {
      void checkRelay();
    }, pollMs);

    const handleOnline = () => {
      setStatus((current) => ({ ...current, browserOnline: true }));
      void checkRelay();
    };

    const handleOffline = () => {
      setStatus((current) => ({ ...current, browserOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkRelay, pollMs]);

  return status;
}
