import { customAlphabet } from 'nanoid';

const generateQueueId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16);

export type QueuedCommandStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type QueuedCommand = {
  id: string;
  registerId: string;
  clientNumber: string;
  action: string;
  payload: unknown;
  createdAt: string;
  attempts: number;
  status: QueuedCommandStatus;
  lastError?: string;
  completedAt?: string;
};

const MAX_ATTEMPTS = 5;

export class CommandQueue {
  private commands = new Map<string, QueuedCommand>();

  enqueue(input: {
    registerId: string;
    clientNumber: string;
    action: string;
    payload: unknown;
  }): QueuedCommand {
    const command: QueuedCommand = {
      id: generateQueueId(),
      registerId: input.registerId,
      clientNumber: input.clientNumber.trim().toUpperCase(),
      action: input.action,
      payload: input.payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      status: 'pending',
    };

    this.commands.set(command.id, command);
    return command;
  }

  listPending(registerId?: string): QueuedCommand[] {
    return [...this.commands.values()]
      .filter((command) => command.status === 'pending' && (!registerId || command.registerId === registerId))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  listForRegister(clientNumber: string, registerId: string): QueuedCommand[] {
    const normalized = clientNumber.trim().toUpperCase();
    return [...this.commands.values()]
      .filter(
        (command) =>
          command.clientNumber === normalized &&
          command.registerId === registerId &&
          (command.status === 'pending' || command.status === 'processing'),
      )
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  get(id: string): QueuedCommand | undefined {
    return this.commands.get(id);
  }

  markProcessing(id: string): QueuedCommand | undefined {
    const command = this.commands.get(id);
    if (!command) {
      return undefined;
    }

    command.status = 'processing';
    command.attempts += 1;
    return command;
  }

  markCompleted(id: string): QueuedCommand | undefined {
    const command = this.commands.get(id);
    if (!command) {
      return undefined;
    }

    command.status = 'completed';
    command.completedAt = new Date().toISOString();
    delete command.lastError;
    return command;
  }

  markFailed(id: string, error: string): QueuedCommand | undefined {
    const command = this.commands.get(id);
    if (!command) {
      return undefined;
    }

    command.lastError = error;
    command.status = command.attempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
    return command;
  }
}

export const commandQueue = new CommandQueue();
