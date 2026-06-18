import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';
import { env } from '@/config/env.config';
import type { RegisterSnapshot } from './remote-snapshot.builder';
import { RemoteSnapshotService } from './remote-snapshot.service';

type RemoteDeviceConfig = {
  deviceToken: string;
  clientNumber: string;
  registerId: string;
  registerLabel: string;
  relayUrl: string;
  pairedAt: string;
};

type PairCompleteResponse = {
  deviceToken: string;
  clientNumber: string;
  registerId: string;
  registerLabel: string;
};

@Injectable()
export class RemoteAgentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RemoteAgentService.name);
  private readonly deviceFilePath = path.join(env.appDataDir, 'remote', 'device.json');
  private deviceConfig: RemoteDeviceConfig | null = null;
  private ws: WebSocket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private snapshotTimer: NodeJS.Timeout | null = null;

  constructor(private readonly snapshotService: RemoteSnapshotService) {}

  onModuleInit(): void {
    fs.mkdirSync(path.dirname(this.deviceFilePath), { recursive: true });
    this.deviceConfig = this.loadDeviceConfig();

    if (this.deviceConfig && env.remoteEnabled) {
      this.connectWebSocket();
      this.startBackgroundJobs();
    }
  }

  onModuleDestroy(): void {
    this.stopBackgroundJobs();
    this.ws?.close();
  }

  getStatus() {
    const config = this.loadDeviceConfig();
    return {
      enabled: env.remoteEnabled,
      paired: Boolean(config),
      connected: this.ws?.readyState === WebSocket.OPEN,
      relayUrl: env.remoteRelayUrl,
      lastSeen: config ? new Date().toISOString() : null,
      registerLabel: config?.registerLabel ?? null,
    };
  }

  getConfig() {
    const config = this.loadDeviceConfig();
    if (!config) {
      return {
        paired: false,
        clientNumber: null,
        registerId: null,
        registerLabel: null,
      };
    }

    return {
      paired: true,
      clientNumber: config.clientNumber,
      registerId: config.registerId,
      registerLabel: config.registerLabel,
    };
  }

  async pair(pairingCode: string) {
    if (!env.remoteEnabled) {
      throw new ServiceUnavailableException('Remote agent disabled');
    }

    const response = await fetch(`${env.remoteRelayUrl}/pairing/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: pairingCode.trim().toUpperCase() }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new ServiceUnavailableException(body.error ?? 'Unable to complete pairing');
    }

    const payload = (await response.json()) as PairCompleteResponse;
    const config: RemoteDeviceConfig = {
      deviceToken: payload.deviceToken,
      clientNumber: payload.clientNumber,
      registerId: payload.registerId,
      registerLabel: payload.registerLabel,
      relayUrl: env.remoteRelayUrl,
      pairedAt: new Date().toISOString(),
    };

    this.saveDeviceConfig(config);
    this.deviceConfig = config;
    this.connectWebSocket();
    this.startBackgroundJobs();

    return {
      paired: true,
      clientNumber: config.clientNumber,
      registerId: config.registerId,
      registerLabel: config.registerLabel,
    };
  }

  private loadDeviceConfig(): RemoteDeviceConfig | null {
    if (!fs.existsSync(this.deviceFilePath)) {
      return null;
    }

    try {
      const raw = fs.readFileSync(this.deviceFilePath, 'utf8');
      return JSON.parse(raw) as RemoteDeviceConfig;
    } catch (error) {
      this.logger.warn(`Invalid remote device config: ${String(error)}`);
      return null;
    }
  }

  private saveDeviceConfig(config: RemoteDeviceConfig): void {
    fs.mkdirSync(path.dirname(this.deviceFilePath), { recursive: true });
    fs.writeFileSync(this.deviceFilePath, JSON.stringify(config, null, 2), 'utf8');
  }

  private connectWebSocket(): void {
    const config = this.deviceConfig ?? this.loadDeviceConfig();
    if (!config) {
      return;
    }

    const wsBase = env.remoteRelayUrl.replace(/^http/i, 'ws');
    const url = `${wsBase}/ws/agent?deviceToken=${encodeURIComponent(config.deviceToken)}`;

    this.ws?.close();
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      this.logger.log('Remote agent connected to relay');
      void this.pushSnapshot();
      this.sendHeartbeat();
    });

    this.ws.on('error', (error) => {
      this.logger.warn(`Remote WS error: ${error.message}`);
    });

    this.ws.on('close', () => {
      this.logger.warn('Remote WS disconnected; retrying in 10s');
      setTimeout(() => this.connectWebSocket(), 10_000);
    });
  }

  private startBackgroundJobs(): void {
    this.stopBackgroundJobs();

    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), 30_000);
    this.snapshotTimer = setInterval(() => {
      void this.pushSnapshot();
    }, 60_000);
  }

  private stopBackgroundJobs(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
    }
  }

  private sendHeartbeat(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(JSON.stringify({ type: 'heartbeat', at: new Date().toISOString() }));
  }

  private async pushSnapshot(): Promise<void> {
    const config = this.deviceConfig ?? this.loadDeviceConfig();
    if (!config || this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }

    const snapshot: RegisterSnapshot = await this.snapshotService.buildSnapshot({
      registerId: config.registerId,
      clientNumber: config.clientNumber,
      registerLabel: config.registerLabel,
    });

    this.ws.send(JSON.stringify({ type: 'snapshot', payload: snapshot }));
  }
}

export function getDefaultMachineId(): string {
  return `${os.hostname()}-${process.pid}`;
}
