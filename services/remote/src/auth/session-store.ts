import { customAlphabet } from 'nanoid';
import type { PortalAuthPayload, PortalLoginResponse } from '../types.js';

const generateToken = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 48);

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type PortalSessionRecord = PortalLoginResponse & {
  createdAt: string;
};

export class SessionStore {
  private sessions = new Map<string, PortalSessionRecord>();

  create(payload: PortalAuthPayload): { sessionToken: string; expiresAt: string } {
    const sessionToken = generateToken();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + SESSION_TTL_MS);

    this.sessions.set(sessionToken, {
      ...payload,
      sessionToken,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    return { sessionToken, expiresAt: expiresAt.toISOString() };
  }

  get(sessionToken: string): PortalSessionRecord | undefined {
    const session = this.sessions.get(sessionToken.trim());
    if (!session) {
      return undefined;
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.sessions.delete(sessionToken);
      return undefined;
    }

    return session;
  }

  revoke(sessionToken: string): void {
    this.sessions.delete(sessionToken.trim());
  }
}

export const sessionStore = new SessionStore();
