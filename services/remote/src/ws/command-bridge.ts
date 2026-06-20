type PendingCommand = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

export class CommandBridge {
  private pending = new Map<string, PendingCommand>();

  waitForResponse(commandId: string, timeoutMs = 15_000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(commandId);
        reject(new Error('La caja no respondió a tiempo (timeout)'));
      }, timeoutMs);

      this.pending.set(commandId, { resolve, reject, timer });
    });
  }

  resolveResponse(commandId: string, ok: boolean, payload?: unknown, error?: string): void {
    const pending = this.pending.get(commandId);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timer);
    this.pending.delete(commandId);

    if (ok) {
      pending.resolve(payload);
      return;
    }

    pending.reject(new Error(error ?? 'Command failed'));
  }
}

export const commandBridge = new CommandBridge();
