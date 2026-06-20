import {
  increaseRegisterPricesByCategory,
} from '@/lib/remote-api';
import {
  listDeferredCommands,
  removeDeferredCommand,
  updateDeferredCommand,
} from '@/lib/deferred-queue';

export async function flushDeferredPriceIncreases(sessionToken: string): Promise<number> {
  const items = listDeferredCommands();
  let flushed = 0;

  for (const item of items) {
    try {
      const response = await increaseRegisterPricesByCategory(
        sessionToken,
        item.clientNumber,
        item.registerId,
        item.category,
        item.percent,
      );

      if (response.deferred) {
        continue;
      }

      removeDeferredCommand(item.id);
      flushed += 1;
    } catch (error) {
      updateDeferredCommand(item.id, {
        attempts: item.attempts + 1,
        lastError: error instanceof Error ? error.message : 'Sync failed',
      });
    }
  }

  return flushed;
}
