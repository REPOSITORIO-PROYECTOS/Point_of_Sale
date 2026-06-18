import { customAlphabet } from 'nanoid';
import { buildDefaultSnapshot, normalizeSnapshot, snapshotSummary } from '../snapshot.js';
import type {
  PairingCode,
  Register,
  RegisterSnapshot,
  RegisterSummary,
  Tenant,
  TenantDetail,
} from '../types.js';

const generateId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);
const generatePairingCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

export class MemoryStore {
  private tenants = new Map<string, Tenant>();
  private tenantsByClientNumber = new Map<string, Tenant>();
  private registers = new Map<string, Register>();
  private registersByTenant = new Map<string, Set<string>>();
  private pairingCodes = new Map<string, PairingCode>();
  private snapshots = new Map<string, RegisterSnapshot>();
  private heartbeatHistory = new Map<string, string[]>();

  createTenant(clientNumber: string, name: string, contactEmail?: string): Tenant {
    const normalized = clientNumber.trim().toUpperCase();
    if (this.tenantsByClientNumber.has(normalized)) {
      throw new Error(`Tenant ${normalized} already exists`);
    }

    const tenant: Tenant = {
      id: generateId(),
      clientNumber: normalized,
      name: name.trim(),
      ...(contactEmail?.trim() ? { contactEmail: contactEmail.trim() } : {}),
      createdAt: new Date().toISOString(),
    };

    this.tenants.set(tenant.id, tenant);
    this.tenantsByClientNumber.set(normalized, tenant);
    this.registersByTenant.set(tenant.id, new Set());
    return tenant;
  }

  listTenants(): Tenant[] {
    return [...this.tenants.values()].sort((left, right) =>
      left.clientNumber.localeCompare(right.clientNumber),
    );
  }

  getTenantByClientNumber(clientNumber: string): Tenant | undefined {
    return this.tenantsByClientNumber.get(clientNumber.trim().toUpperCase());
  }

  getTenantById(tenantId: string): Tenant | undefined {
    return this.tenants.get(tenantId);
  }

  getTenantDetail(clientNumber: string): TenantDetail | undefined {
    const tenant = this.getTenantByClientNumber(clientNumber);
    if (!tenant) {
      return undefined;
    }

    return {
      clientNumber: tenant.clientNumber,
      name: tenant.name,
      contactEmail: tenant.contactEmail,
      createdAt: tenant.createdAt,
      registers: this.listRegisters(clientNumber).map((register) => this.toRegisterSummary(register, clientNumber)),
    };
  }

  getRegisterById(registerId: string): Register | undefined {
    return this.registers.get(registerId);
  }

  createRegister(clientNumber: string, registerLabel: string, portalUserIds: string[] = []): Register {
    const tenant = this.getTenantByClientNumber(clientNumber);
    if (!tenant) {
      throw new Error(`Tenant ${clientNumber} not found`);
    }

    const register: Register = {
      id: generateId(),
      tenantId: tenant.id,
      label: registerLabel.trim(),
      assignedPortalUserIds: [...portalUserIds],
      online: false,
    };

    this.registers.set(register.id, register);
    this.registersByTenant.get(tenant.id)?.add(register.id);
    return register;
  }

  listRegisters(clientNumber: string): Register[] {
    const tenant = this.getTenantByClientNumber(clientNumber);
    if (!tenant) {
      return [];
    }

    const ids = this.registersByTenant.get(tenant.id) ?? new Set<string>();
    return [...ids]
      .map((id) => this.registers.get(id))
      .filter((register): register is Register => register !== undefined);
  }

  getRegister(clientNumber: string, registerId: string): Register | undefined {
    const register = this.registers.get(registerId);
    if (!register) {
      return undefined;
    }

    const tenant = this.tenants.get(register.tenantId);
    if (!tenant || tenant.clientNumber !== clientNumber.trim().toUpperCase()) {
      return undefined;
    }

    return register;
  }

  assignPortalUsers(registerId: string, portalUserIds: string[]): Register {
    const register = this.registers.get(registerId);
    if (!register) {
      throw new Error('Register not found');
    }

    register.assignedPortalUserIds = [...new Set(portalUserIds)];
    return register;
  }

  createPairingCode(tenantId: string, registerId: string, ttlMinutes: number): PairingCode {
    const register = this.registers.get(registerId);
    if (!register || register.tenantId !== tenantId) {
      throw new Error('Register not found for tenant');
    }

    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
    const pairing: PairingCode = {
      code: generatePairingCode(),
      tenantId,
      registerId,
      expiresAt,
      confirmed: false,
    };

    this.pairingCodes.set(pairing.code, pairing);
    return pairing;
  }

  requestPairingCode(
    clientNumber: string,
    registerLabel: string,
    machineId: string | undefined,
    ttlMinutes: number,
  ): PairingCode {
    let tenant = this.getTenantByClientNumber(clientNumber);
    if (!tenant) {
      tenant = this.createTenant(clientNumber, clientNumber);
    }

    let register = this.listRegisters(clientNumber).find((item) => item.label === registerLabel.trim());
    if (!register) {
      register = this.createRegister(clientNumber, registerLabel);
    }

    if (machineId) {
      register.machineId = machineId;
    }

    return this.createPairingCode(tenant.id, register.id, ttlMinutes);
  }

  getPairingCode(code: string): PairingCode | undefined {
    const pairing = this.pairingCodes.get(code.trim().toUpperCase());
    if (!pairing) {
      return undefined;
    }

    if (new Date(pairing.expiresAt).getTime() < Date.now()) {
      this.pairingCodes.delete(pairing.code);
      return undefined;
    }

    return pairing;
  }

  confirmPairing(code: string, portalUserId: string): PairingCode {
    const pairing = this.getPairingCode(code);
    if (!pairing) {
      throw new Error('Invalid or expired pairing code');
    }

    pairing.confirmed = true;
    pairing.confirmedByPortalUserId = portalUserId;

    const register = this.registers.get(pairing.registerId);
    if (register && !register.assignedPortalUserIds.includes(portalUserId)) {
      register.assignedPortalUserIds.push(portalUserId);
    }

    return pairing;
  }

  completePairing(code: string): { register: Register; deviceToken: string; tenant: Tenant } {
    const pairing = this.getPairingCode(code);
    if (!pairing) {
      throw new Error('Invalid or expired pairing code');
    }

    if (!pairing.confirmed) {
      throw new Error('Pairing code not confirmed by portal yet');
    }

    const register = this.registers.get(pairing.registerId);
    const tenant = this.tenants.get(pairing.tenantId);
    if (!register || !tenant) {
      throw new Error('Register or tenant not found');
    }

    const deviceToken = generateId() + generateId();
    register.deviceToken = deviceToken;
    this.pairingCodes.delete(pairing.code);

    return { register, deviceToken, tenant };
  }

  getRegisterByDeviceToken(deviceToken: string): Register | undefined {
    return [...this.registers.values()].find((register) => register.deviceToken === deviceToken);
  }

  setRegisterOnline(registerId: string, online: boolean): Register | undefined {
    const register = this.registers.get(registerId);
    if (!register) {
      return undefined;
    }

    register.online = online;
    register.lastSeen = new Date().toISOString();
    return register;
  }

  recordHeartbeat(registerId: string, at?: string): string[] {
    const timestamp = at ?? new Date().toISOString();
    const history = this.heartbeatHistory.get(registerId) ?? [];
    const next = [timestamp, ...history].slice(0, 5);
    this.heartbeatHistory.set(registerId, next);
    return next;
  }

  getHeartbeatHistory(registerId: string): string[] {
    return this.heartbeatHistory.get(registerId) ?? [];
  }

  touchRegister(registerId: string, at?: string): Register | undefined {
    const register = this.registers.get(registerId);
    if (!register) {
      return undefined;
    }

    const timestamp = at ?? new Date().toISOString();
    register.lastSeen = timestamp;
    register.online = true;
    this.recordHeartbeat(registerId, timestamp);
    return register;
  }

  setSnapshot(snapshot: RegisterSnapshot): RegisterSnapshot {
    const register = this.registers.get(snapshot.registerId);
    if (!register) {
      return snapshot;
    }

    const tenant = this.tenants.get(register.tenantId);
    const clientNumber = tenant?.clientNumber ?? snapshot.clientNumber;
    const normalized = normalizeSnapshot(snapshot, register, this.getHeartbeatHistory(register.id));
    this.snapshots.set(snapshot.registerId, normalized);
    return normalized;
  }

  getSnapshot(clientNumber: string, registerId: string): RegisterSnapshot | undefined {
    const register = this.getRegister(clientNumber, registerId);
    if (!register) {
      return undefined;
    }

    const existing = this.snapshots.get(registerId);
    if (existing) {
      return {
        ...existing,
        online: register.online,
        heartbeatHistory: this.getHeartbeatHistory(registerId),
      };
    }

    return buildDefaultSnapshot(register, clientNumber, this.getHeartbeatHistory(registerId));
  }

  private toRegisterSummary(register: Register, clientNumber: string): RegisterSummary {
    const snapshot = this.getSnapshot(clientNumber, register.id);
    return {
      id: register.id,
      label: register.label,
      online: register.online,
      lastSeen: register.lastSeen,
      paired: Boolean(register.deviceToken),
      ...(snapshot ? { snapshot: snapshotSummary(snapshot) } : {}),
    };
  }
}

export const store = new MemoryStore();
