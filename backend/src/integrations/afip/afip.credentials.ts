import { AfipConfigService } from './afip-config.service';

let afipConfigServiceRef: AfipConfigService | null = null;

export function bindAfipConfigService(service: AfipConfigService) {
  afipConfigServiceRef = service;
}

export function loadAfipCredentials() {
  if (!afipConfigServiceRef) {
    throw new Error('AfipConfigService is not initialized');
  }

  return afipConfigServiceRef.loadCredentials();
}

export function hasAfipCredentialsConfigured() {
  if (!afipConfigServiceRef) {
    return false;
  }

  return afipConfigServiceRef.isConfigured();
}

export { getAfipCertificatePath, getAfipPrivateKeyPath, getAfipStorageDir } from './afip-config.storage';
