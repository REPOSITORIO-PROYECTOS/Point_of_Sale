import type { WebSocket } from 'ws';
import { customAlphabet } from 'nanoid';
import { snapshotSummary } from '../snapshot.js';
import type { Register, RegisterPresence, RegisterSnapshot, WsAgentMessage, WsPortalMessage } from '../types.js';
import { store } from '../store/memory-store.js';
import { commandQueue } from '../store/command-queue.js';
import { normalizeCashHistory, normalizeCatalog } from '../normalize-register-data.js';
import { commandBridge } from './command-bridge.js';

const generateCommandId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16);

type AgentConnection = {
  socket: WebSocket;
  registerId: string;
  clientNumber: string;
};

type PortalConnection = {
  socket: WebSocket;
  clientNumber: string;
};

export class WsHub {
  private agents = new Map<string, AgentConnection>();
  private portals = new Set<PortalConnection>();

  handleAgentConnection(socket: WebSocket, deviceToken: string): void {
    const register = store.getRegisterByDeviceToken(deviceToken);
    if (!register) {
      socket.close(4401, 'Invalid device token');
      return;
    }

    const tenant = store.getTenantById(register.tenantId);
    if (!tenant) {
      socket.close(4401, 'Tenant not found');
      return;
    }

    store.setRegisterOnline(register.id, true);
    this.agents.set(register.id, {
      socket,
      registerId: register.id,
      clientNumber: tenant.clientNumber,
    });

    this.broadcastRegisterUpdate(tenant.clientNumber, register);
    void this.drainPendingCommands(register.id, tenant.clientNumber);

    socket.on('message', (raw) => {
      this.handleAgentMessage(register.id, tenant.clientNumber, raw.toString());
    });

    socket.on('close', () => {
      this.agents.delete(register.id);
      const updated = store.setRegisterOnline(register.id, false);
      if (updated) {
        this.broadcastRegisterUpdate(tenant.clientNumber, updated);
        const snapshot = store.getSnapshot(tenant.clientNumber, register.id);
        if (snapshot) {
          this.broadcastSnapshotUpdate(tenant.clientNumber, { ...snapshot, online: false });
        }
      }
    });
  }

  handlePortalConnection(socket: WebSocket): void {
    const connection: PortalConnection = { socket, clientNumber: '' };
    this.portals.add(connection);

    socket.on('message', (raw) => {
      try {
        const message = JSON.parse(raw.toString()) as WsPortalMessage;
        if (message.type === 'subscribe' && message.clientNumber.trim()) {
          connection.clientNumber = message.clientNumber.trim().toUpperCase();
          this.sendRegistersToPortal(connection);
        }

        if (message.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        socket.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
      }
    });

    socket.on('close', () => {
      this.portals.delete(connection);
    });
  }

  private handleAgentMessage(registerId: string, clientNumber: string, raw: string): void {
    try {
      const message = JSON.parse(raw) as WsAgentMessage;

      if (message.type === 'heartbeat') {
        const register = store.touchRegister(registerId, message.at);
        if (register) {
          this.broadcastRegisterUpdate(clientNumber, register);
          const snapshot = store.getSnapshot(clientNumber, registerId);
          if (snapshot) {
            const refreshed: RegisterSnapshot = {
              ...snapshot,
              online: true,
              lastHeartbeatAt: message.at,
              heartbeatHistory: store.getHeartbeatHistory(registerId),
            };
            store.setSnapshot(refreshed);
            this.broadcastSnapshotUpdate(clientNumber, refreshed);
          }
        }
        return;
      }

      if (message.type === 'snapshot') {
        const register = store.touchRegister(registerId);
        if (!register) {
          return;
        }

        const normalized = store.setSnapshot({
          ...message.payload,
          registerId,
          clientNumber,
          online: true,
          lastHeartbeatAt: message.payload.lastHeartbeatAt ?? new Date().toISOString(),
          heartbeatHistory: store.getHeartbeatHistory(registerId),
        });

        this.broadcastRegisterUpdate(clientNumber, register);
        this.broadcastSnapshotUpdate(clientNumber, normalized);
        return;
      }

      if (message.type === 'data_push') {
        const register = store.touchRegister(registerId);
        if (!register) {
          return;
        }

        let catalogSyncedAt: string | undefined;
        let cashHistorySyncedAt: string | undefined;

        if (message.payload.catalog) {
          const catalog = store.setCatalog(
            normalizeCatalog(clientNumber, registerId, message.payload.catalog),
          );
          catalogSyncedAt = catalog.syncedAt;
        }

        if (message.payload.cashHistory) {
          const history = store.setCashHistory(
            normalizeCashHistory(clientNumber, registerId, message.payload.cashHistory),
          );
          cashHistorySyncedAt = history.syncedAt;
        }

        this.broadcastRegisterUpdate(clientNumber, register);
        this.broadcastDataUpdate(clientNumber, registerId, catalogSyncedAt, cashHistorySyncedAt);
        return;
      }

      if (message.type === 'command_response' && message.commandId) {
        commandBridge.resolveResponse(message.commandId, message.ok, message.payload, message.error);
      }
    } catch {
      // ignore malformed agent payloads in MVP
    }
  }

  private toPresence(register: Register, clientNumber: string): RegisterPresence {
    const snapshot = store.getSnapshot(clientNumber, register.id);
    return {
      id: register.id,
      label: register.label,
      online: register.online,
      lastSeen: register.lastSeen,
      assignedPortalUserIds: register.assignedPortalUserIds,
      ...(snapshot ? { snapshot: snapshotSummary(snapshot) } : {}),
    };
  }

  private sendRegistersToPortal(connection: PortalConnection): void {
    const registers = store
      .listRegisters(connection.clientNumber)
      .map((register) => this.toPresence(register, connection.clientNumber));
    connection.socket.send(JSON.stringify({ type: 'registers', registers }));
  }

  private broadcastRegisterUpdate(clientNumber: string, register: Register): void {
    const payload = JSON.stringify({
      type: 'register_update',
      register: this.toPresence(register, clientNumber),
    });

    for (const portal of this.portals) {
      if (portal.clientNumber === clientNumber) {
        portal.socket.send(payload);
      }
    }
  }

  private broadcastSnapshotUpdate(clientNumber: string, snapshot: RegisterSnapshot): void {
    const payload = JSON.stringify({
      type: 'snapshot_update',
      snapshot,
    });

    for (const portal of this.portals) {
      if (portal.clientNumber === clientNumber) {
        portal.socket.send(payload);
      }
    }
  }

  private broadcastDataUpdate(
    clientNumber: string,
    registerId: string,
    catalogSyncedAt?: string,
    cashHistorySyncedAt?: string,
  ): void {
    const payload = JSON.stringify({
      type: 'data_update',
      registerId,
      ...(catalogSyncedAt ? { catalogSyncedAt } : {}),
      ...(cashHistorySyncedAt ? { cashHistorySyncedAt } : {}),
    });

    for (const portal of this.portals) {
      if (portal.clientNumber === clientNumber) {
        portal.socket.send(payload);
      }
    }
  }

  async sendCommand(
    registerId: string,
    action: string,
    payload?: unknown,
    timeoutMs = 15_000,
  ): Promise<unknown> {
    const agent = this.agents.get(registerId);
    if (!agent) {
      throw new Error('La caja está offline. Conectá el POS para sincronizar.');
    }

    const commandId = generateCommandId();
    const responsePromise = commandBridge.waitForResponse(commandId, timeoutMs);

    agent.socket.send(
      JSON.stringify({
        type: 'command',
        commandId,
        action,
        ...(payload !== undefined ? { payload } : {}),
      }),
    );

    return responsePromise;
  }

  isRegisterOnline(registerId: string): boolean {
    return this.agents.has(registerId);
  }

  async drainPendingCommands(registerId: string, clientNumber: string): Promise<void> {
    if (!this.isRegisterOnline(registerId)) {
      return;
    }

    const pending = commandQueue.listPending(registerId);
    for (const queued of pending) {
      commandQueue.markProcessing(queued.id);

      try {
        await this.sendCommand(registerId, queued.action, queued.payload);
        commandQueue.markCompleted(queued.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Command failed';
        commandQueue.markFailed(queued.id, message);
      }
    }

    if (pending.length > 0) {
      const register = store.getRegister(clientNumber, registerId);
      if (register) {
        this.broadcastRegisterUpdate(clientNumber, register);
      }
    }
  }
}

export const wsHub = new WsHub();
