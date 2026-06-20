import { customAlphabet } from 'nanoid';
import { hashPortalPassword, verifyPortalPassword } from '../auth/password-crypto.js';
import {
  buildDeveloperPayload,
  type DeveloperAccount,
  normalizePortalEmail,
} from '../auth/portal-roles.js';
import { buildDefaultSnapshot, normalizeSnapshot, snapshotSummary } from '../snapshot.js';
import type {
  ClientOverview,
  PairingCode,
  PortalAuthPayload,
  Register,
  RegisterClientResponse,
  RegisterSnapshot,
  RegisterSummary,
  RegisterCatalog,
  RegisterCashHistory,
  Tenant,
  TenantDetail,
  TenantMessage,
} from '../types.js';

const generateId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);
const generatePairingCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);
const generatePortalPassword = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz', 10);

export class MemoryStore {
  private tenants = new Map<string, Tenant>();
  private tenantsByClientNumber = new Map<string, Tenant>();
  private tenantsByEmail = new Map<string, Tenant>();
  private developerAccount: DeveloperAccount | null = null;
  private registers = new Map<string, Register>();
  private registersByTenant = new Map<string, Set<string>>();
  private pairingCodes = new Map<string, PairingCode>();
  private snapshots = new Map<string, RegisterSnapshot>();
  private catalogs = new Map<string, RegisterCatalog>();
  private cashHistories = new Map<string, RegisterCashHistory>();
  private heartbeatHistory = new Map<string, string[]>();
  private tenantMessages = new Map<string, TenantMessage[]>();

  generateClientNumber(): string {
    let max = 0;

    for (const tenant of this.tenants.values()) {
      const match = tenant.clientNumber.match(/^CLI-(\d+)$/i);
      if (match) {
        max = Math.max(max, Number.parseInt(match[1], 10));
      }
    }

    const next = max + 1;
    return `CLI-${String(next).padStart(5, '0')}`;
  }

  async seedDeveloperAccount(email: string, passwordPlain: string, displayName: string): Promise<void> {
    this.developerAccount = {
      email: normalizePortalEmail(email),
      passwordHash: await hashPortalPassword(passwordPlain),
      displayName,
    };
  }

  async createTenant(
    clientNumber: string,
    name: string,
    contactEmail: string,
    portalPasswordPlain?: string,
  ): Promise<Tenant> {
    const normalized = clientNumber.trim().toUpperCase();
    const email = normalizePortalEmail(contactEmail);

    if (this.tenantsByClientNumber.has(normalized)) {
      throw new Error(`Tenant ${normalized} already exists`);
    }

    if (this.tenantsByEmail.has(email)) {
      throw new Error('Ya existe un cliente con ese email');
    }

    if (this.developerAccount?.email === email) {
      throw new Error('Ese email está reservado');
    }

    const portalPasswordHash = portalPasswordPlain
      ? await hashPortalPassword(portalPasswordPlain)
      : undefined;

    const tenant: Tenant = {
      id: generateId(),
      clientNumber: normalized,
      name: name.trim(),
      contactEmail: email,
      ...(portalPasswordHash ? { portalPasswordHash } : {}),
      createdAt: new Date().toISOString(),
    };

    this.tenants.set(tenant.id, tenant);
    this.tenantsByClientNumber.set(normalized, tenant);
    this.tenantsByEmail.set(email, tenant);
    this.registersByTenant.set(tenant.id, new Set());
    return tenant;
  }

  async registerClientWithCredentials(
    name: string,
    email: string,
    password: string,
  ): Promise<RegisterClientResponse> {
    const trimmedName = name.trim();
    const normalizedEmail = normalizePortalEmail(email);
    const trimmedPassword = password.trim();

    if (!trimmedName) {
      throw new Error('El nombre del negocio es obligatorio');
    }

    if (!normalizedEmail.includes('@')) {
      throw new Error('Ingresá un email válido');
    }

    if (trimmedPassword.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    let clientNumber = this.generateClientNumber();
    while (this.tenantsByClientNumber.has(clientNumber)) {
      clientNumber = this.generateClientNumber();
    }

    const tenant = await this.createTenant(clientNumber, trimmedName, normalizedEmail, trimmedPassword);

    return {
      tenant,
      clientNumber: tenant.clientNumber,
      email: tenant.contactEmail,
      message: `Cliente ${clientNumber} creado. Ingresá con tu email y contraseña.`,
    };
  }

  /** @deprecated Usar registerClientWithCredentials */
  async registerClientAuto(name: string, contactEmail?: string): Promise<RegisterClientResponse> {
    const email = contactEmail?.trim() || `${generateId()}@cliente.local`;
    const portalPassword = generatePortalPassword();
    return this.registerClientWithCredentials(name, email, portalPassword);
  }

  async loginByEmail(email: string, password: string): Promise<PortalAuthPayload> {
    const normalizedEmail = normalizePortalEmail(email);

    if (!normalizedEmail) {
      throw new Error('Ingresá tu email');
    }

    if (this.developerAccount?.email === normalizedEmail) {
      const passwordMatches = await verifyPortalPassword(password, this.developerAccount.passwordHash);
      if (!passwordMatches) {
        throw new Error('Contraseña incorrecta');
      }

      return buildDeveloperPayload(this.developerAccount);
    }

    const tenant = this.tenantsByEmail.get(normalizedEmail);
    if (!tenant) {
      throw new Error('Email no registrado');
    }

    const passwordMatches = await verifyPortalPassword(password, tenant.portalPasswordHash);
    if (!passwordMatches) {
      throw new Error('Contraseña incorrecta');
    }

    return {
      role: 'client',
      email: tenant.contactEmail,
      clientNumber: tenant.clientNumber,
      tenantId: tenant.id,
      tenantName: tenant.name,
      portalUserId: `portal-${tenant.clientNumber.toLowerCase()}`,
    };
  }

  async setPortalPassword(clientNumber: string, password: string): Promise<Tenant> {
    const tenant = this.getTenantByClientNumber(clientNumber);
    if (!tenant) {
      throw new Error('Cliente no encontrado');
    }

    tenant.portalPasswordHash = await hashPortalPassword(password);
    this.tenants.set(tenant.id, tenant);
    return tenant;
  }

  async changeClientPassword(
    email: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const tenant = this.getTenantByEmail(email);
    if (!tenant) {
      throw new Error('Cliente no encontrado');
    }

    const currentMatches = await verifyPortalPassword(currentPassword, tenant.portalPasswordHash);
    if (!currentMatches) {
      throw new Error('Contraseña actual incorrecta');
    }

    if (newPassword.trim().length < 6) {
      throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
    }

    tenant.portalPasswordHash = await hashPortalPassword(newPassword);
    this.tenants.set(tenant.id, tenant);
  }

  sendDeveloperMessage(clientNumber: string, fromEmail: string, body: string): TenantMessage {
    const tenant = this.getTenantByClientNumber(clientNumber);
    if (!tenant) {
      throw new Error('Cliente no encontrado');
    }

    const trimmedBody = body.trim();
    if (!trimmedBody) {
      throw new Error('El mensaje no puede estar vacío');
    }

    const message: TenantMessage = {
      id: generateId(),
      clientNumber: tenant.clientNumber,
      tenantName: tenant.name,
      fromEmail,
      body: trimmedBody,
      createdAt: new Date().toISOString(),
    };

    const existing = this.tenantMessages.get(tenant.id) ?? [];
    this.tenantMessages.set(tenant.id, [message, ...existing]);
    return message;
  }

  listTenantMessages(clientNumber: string): TenantMessage[] {
    const tenant = this.getTenantByClientNumber(clientNumber);
    if (!tenant) {
      return [];
    }

    return [...(this.tenantMessages.get(tenant.id) ?? [])];
  }

  listMessagesForTenantId(tenantId: string): TenantMessage[] {
    return [...(this.tenantMessages.get(tenantId) ?? [])];
  }

  markTenantMessageRead(tenantId: string, messageId: string): TenantMessage {
    const messages = this.tenantMessages.get(tenantId) ?? [];
    const message = messages.find((item) => item.id === messageId);
    if (!message) {
      throw new Error('Mensaje no encontrado');
    }

    message.readAt = new Date().toISOString();
    return message;
  }

  countUnreadMessages(tenantId: string): number {
    return this.listMessagesForTenantId(tenantId).filter((message) => !message.readAt).length;
  }

  listTenants(): Tenant[] {
    return [...this.tenants.values()].sort((left, right) =>
      left.clientNumber.localeCompare(right.clientNumber),
    );
  }

  getTenantByEmail(email: string): Tenant | undefined {
    return this.tenantsByEmail.get(normalizePortalEmail(email));
  }

  listClientsOverview(): ClientOverview[] {
    return this.listTenants().map((tenant) => {
      const registers = this.listRegisters(tenant.clientNumber).map((register) =>
        this.toRegisterSummary(register, tenant.clientNumber),
      );

      const availableViews = [
        'dashboard',
        'pairing',
        ...registers.map((register) => `register:${register.label}`),
      ];

      return {
        clientNumber: tenant.clientNumber,
        name: tenant.name,
        contactEmail: tenant.contactEmail,
        createdAt: tenant.createdAt,
        registers,
        availableViews,
        unreadMessages: this.countUnreadMessages(tenant.id),
      };
    });
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
      throw new Error(`Tenant ${clientNumber} not found. Creá el cliente en el portal primero.`);
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

  setCatalog(catalog: RegisterCatalog): RegisterCatalog {
    this.catalogs.set(catalog.registerId, catalog);
    return catalog;
  }

  getCatalog(clientNumber: string, registerId: string): RegisterCatalog | undefined {
    const register = this.getRegister(clientNumber, registerId);
    if (!register) {
      return undefined;
    }

    return this.catalogs.get(registerId);
  }

  setCashHistory(history: RegisterCashHistory): RegisterCashHistory {
    this.cashHistories.set(history.registerId, history);
    return history;
  }

  getCashHistory(clientNumber: string, registerId: string): RegisterCashHistory | undefined {
    const register = this.getRegister(clientNumber, registerId);
    if (!register) {
      return undefined;
    }

    return this.cashHistories.get(registerId);
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
