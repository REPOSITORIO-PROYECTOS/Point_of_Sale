import { BadRequestException, Injectable } from '@nestjs/common';
import { env } from '@/config/env.config';
import type { AfipConfigStatus, AfipStoredConfig } from './afip-config.types';
import {
  ensureAfipStorageDir,
  getAfipCertificatePath,
  getAfipConfigPath,
  getAfipPrivateKeyPath,
  hasAfipCertificateFile,
  hasAfipPrivateKeyFile,
  readAfipCertificate,
  readAfipPrivateKey,
  readStoredAfipConfig,
  validateCertificatePem,
  validateCuit,
  validatePrivateKeyPem,
  writeAfipCertificate,
  writeAfipPrivateKey,
  writeStoredAfipConfig,
} from './afip-config.storage';
import type { AfipCredentials } from './afip.types';

type ImportAfipCredentialsInput = {
  cuit: string;
  certificado: string;
  clavePrivada: string;
  puntoVenta?: number;
  production?: boolean;
};

type SaveAfipPrivateKeyInput = {
  cuit: string;
  clavePrivada: string;
  puntoVenta?: number;
  production?: boolean;
};

type ImportAfipCertificateInput = {
  certificado: string;
};

@Injectable()
export class AfipConfigService {
  getStatus(): AfipConfigStatus {
    ensureAfipStorageDir();
    const stored = readStoredAfipConfig();
    const envCuit = process.env.AFIP_CUIT?.trim() || null;
    const cuit = stored?.cuit ?? envCuit;
    const hasCertificate = hasAfipCertificateFile();
    const hasPrivateKey = hasAfipPrivateKeyFile();

    const configured = Boolean(cuit && hasCertificate && hasPrivateKey);
    const pendingCertificate = Boolean(cuit && hasPrivateKey && !hasCertificate);

    return {
      configured,
      pendingCertificate,
      cuit,
      puntoVenta: stored?.puntoVenta ?? env.afipPuntoVenta,
      production: stored?.production ?? env.afipProduction,
      hasCertificate,
      hasPrivateKey,
      certPath: getAfipCertificatePath(),
      keyPath: getAfipPrivateKeyPath(),
      configPath: getAfipConfigPath(),
      updatedAt: stored?.updatedAt ?? null,
    };
  }

  importCredentials(input: ImportAfipCredentialsInput) {
    try {
      const cuit = validateCuit(input.cuit);
      const certificado = validateCertificatePem(input.certificado);
      const clavePrivada = validatePrivateKeyPem(input.clavePrivada);
      const puntoVenta = input.puntoVenta ?? env.afipPuntoVenta;
      const production = input.production ?? env.afipProduction;

      if (!Number.isInteger(puntoVenta) || puntoVenta < 1) {
        throw new BadRequestException('puntoVenta must be a positive integer');
      }

      writeAfipCertificate(certificado);
      writeAfipPrivateKey(clavePrivada);

      const config: AfipStoredConfig = {
        cuit,
        puntoVenta,
        production,
        updatedAt: new Date().toISOString(),
      };

      writeStoredAfipConfig(config);

      return this.getStatus();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid AFIP credentials');
    }
  }

  savePrivateKey(input: SaveAfipPrivateKeyInput) {
    try {
      const cuit = validateCuit(input.cuit);
      const clavePrivada = validatePrivateKeyPem(input.clavePrivada);
      const puntoVenta = input.puntoVenta ?? readStoredAfipConfig()?.puntoVenta ?? env.afipPuntoVenta;
      const production = input.production ?? readStoredAfipConfig()?.production ?? env.afipProduction;

      if (!Number.isInteger(puntoVenta) || puntoVenta < 1) {
        throw new BadRequestException('puntoVenta must be a positive integer');
      }

      writeAfipPrivateKey(clavePrivada);

      const config: AfipStoredConfig = {
        cuit,
        puntoVenta,
        production,
        updatedAt: new Date().toISOString(),
      };

      writeStoredAfipConfig(config);

      return this.getStatus();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid AFIP private key');
    }
  }

  importCertificate(input: ImportAfipCertificateInput) {
    try {
      const certificado = validateCertificatePem(input.certificado);
      const stored = readStoredAfipConfig();

      if (!stored?.cuit) {
        throw new BadRequestException('Save CUIT and private key before importing the certificate');
      }

      if (!hasAfipPrivateKeyFile()) {
        throw new BadRequestException('Private key is required before importing the certificate');
      }

      writeAfipCertificate(certificado);

      writeStoredAfipConfig({
        ...stored,
        updatedAt: new Date().toISOString(),
      });

      return this.getStatus();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid AFIP certificate');
    }
  }

  loadCredentials(): AfipCredentials {
    const status = this.getStatus();

    if (!status.configured || !status.cuit) {
      throw new BadRequestException('AFIP credentials are not configured. Import certificate and private key first.');
    }

    try {
      return {
        cuit: status.cuit,
        certificado: readAfipCertificate(),
        clave_privada: readAfipPrivateKey(),
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Could not load AFIP credentials');
    }
  }

  isConfigured() {
    return this.getStatus().configured;
  }
}
