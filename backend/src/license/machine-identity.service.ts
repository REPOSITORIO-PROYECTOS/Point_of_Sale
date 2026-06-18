import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import os from 'node:os';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';

const execFileAsync = promisify(execFile);

@Injectable()
export class MachineIdentityService {
  private cachedMachineId: string | null = null;

  async getMachineId(): Promise<string> {
    if (this.cachedMachineId) {
      return this.cachedMachineId;
    }

    const raw = await this.collectRawFingerprint();
    this.cachedMachineId = createHash('sha256').update(raw).digest('hex');
    return this.cachedMachineId;
  }

  private async collectRawFingerprint(): Promise<string> {
    const windowsGuid = await this.readWindowsMachineGuid();
    if (windowsGuid) {
      return windowsGuid;
    }

    return [os.hostname(), this.collectMacAddresses(), os.platform(), os.arch()].join('|');
  }

  private async readWindowsMachineGuid(): Promise<string | null> {
    if (process.platform !== 'win32') {
      return null;
    }

    try {
      const { stdout } = await execFileAsync('reg', [
        'query',
        'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography',
        '/v',
        'MachineGuid',
      ]);

      const match = stdout.match(/MachineGuid\s+REG_SZ\s+(.+)/i);
      return match?.[1]?.trim() ?? null;
    } catch {
      return null;
    }
  }

  private collectMacAddresses(): string {
    const interfaces = os.networkInterfaces();
    const macs = Object.values(interfaces)
      .flat()
      .filter(
        (iface) =>
          iface &&
          !iface.internal &&
          iface.mac &&
          iface.mac !== '00:00:00:00:00:00',
      )
      .map((iface) => iface!.mac)
      .sort();

    return macs.join('|') || 'no-mac';
  }
}
