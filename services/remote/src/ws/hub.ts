import type { WebSocket } from 'ws';
import type { Register, RegisterPresence, RegisterSnapshot, WsAgentMessage, WsPortalMessage } from '../types.js';
import { store } from '../store/memory-store.js';

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

    socket.on('message', (raw) => {
      this.handleAgentMessage(register.id, tenant.clientNumber, raw.toString());
    });

    socket.on('close', () => {
      this.agents.delete(register.id);
      const updated = store.setRegisterOnline(register.id, false);
      if (updated) {
        this.broadcastRegisterUpdate(tenant.clientNumber, updated);
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
        const register = store.touchRegister(registerId);
        if (register) {
          this.broadcastRegisterUpdate(clientNumber, register);
        }
        return;
      }

      if (message.type === 'snapshot') {
        store.setSnapshot(message.payload);
        const register = store.touchRegister(registerId);
        if (register) {
          this.broadcastRegisterUpdate(clientNumber, register);
        }
      }
    } catch {
      // ignore malformed agent payloads in MVP
    }
  }

  private toPresence(register: Register): RegisterPresence {
    return {
      id: register.id,
      label: register.label,
      online: register.online,
      lastSeen: register.lastSeen,
      assignedPortalUserIds: register.assignedPortalUserIds,
    };
  }

  private sendRegistersToPortal(connection: PortalConnection): void {
    const registers = store.listRegisters(connection.clientNumber).map((register) => this.toPresence(register));
    connection.socket.send(JSON.stringify({ type: 'registers', registers }));
  }

  private broadcastRegisterUpdate(clientNumber: string, register: Register): void {
    const payload = JSON.stringify({
      type: 'register_update',
      register: this.toPresence(register),
    });

    for (const portal of this.portals) {
      if (portal.clientNumber === clientNumber) {
        portal.socket.send(payload);
      }
    }
  }

  pushMockSnapshot(registerId: string, clientNumber: string, label: string): RegisterSnapshot {
    const snapshot: RegisterSnapshot = {
      registerId,
      clientNumber,
      label,
      salesToday: Math.round(Math.random() * 250_000),
      ticketCount: Math.round(Math.random() * 80),
      cashSessionOpen: Math.random() > 0.3,
      lastSync: new Date().toISOString(),
      currency: 'ARS',
    };

    store.setSnapshot(snapshot);
    return snapshot;
  }
}

export const wsHub = new WsHub();
