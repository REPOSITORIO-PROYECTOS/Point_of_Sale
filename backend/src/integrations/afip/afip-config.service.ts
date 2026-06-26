import { BadRequestException, Injectable } from '@nestjs/common';
import { env } from '@/config/env.config';
import { generateAfipCsr, generateAfipCsrFromPrivateKey } from './afip-csr.generator';
import type { AfipBillingDefaults } from './afip-billing-defaults';
import { normalizeAfipBillingDefaults } from './afip-billing-defaults';
import type { AfipConfigStatus, AfipStoredConfig } from './afip-config.types';
import {
  clearAfipCredentialFiles,
  clearPendingAfipCsr,
  ensureAfipStorageDir,
  getAfipCertificatePath,
  getAfipConfigPath,
  getAfipPrivateKeyPath,
  hasAfipCertificateFile,
  hasAfipPrivateKeyFile,
  hasPendingAfipCsrFile,
  readAfipBillingDefaults,
  readAfipCertificate,
  readAfipPrivateKey,
  readPendingAfipCsr,
  readStoredAfipConfig,
  validateCertificatePem,
  validateCuit,
  validatePrivateKeyPem,
  writeAfipBillingDefaults,
  writeAfipCertificate,
  writeAfipPrivateKey,
  writePendingAfipCsr,
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

type GenerateAfipCsrInput = {
  cuit: string;
  organization?: string;
  commonName?: string;
  puntoVenta?: number;
  production?: boolean;
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
    const pendingCsr = pendingCertificate ? readPendingAfipCsr() : null;

    return {
      configured,
      pendingCertificate,
      cuit,
      puntoVenta: stored?.puntoVenta ?? env.afipPuntoVenta,
      production: stored?.production ?? env.afipProduction,
      billingDefaults: stored?.billingDefaults ?? readAfipBillingDefaults(),
      hasCertificate,
      hasPrivateKey,
      hasPendingCsr: hasPendingAfipCsrFile(),
      pendingCsr,
      certPath: getAfipCertificatePath(),
      keyPath: getAfipPrivateKeyPath(),
      configPath: getAfipConfigPath(),
      updatedAt: stored?.updatedAt ?? null,
    };
  }

  resetCredentials() {
    clearAfipCredentialFiles();

    const existing = readStoredAfipConfig();
    if (existing) {
      writeStoredAfipConfig({
        ...existing,
        updatedAt: new Date().toISOString(),
      });
    }

    return this.getStatus();
  }

  updateBillingDefaults(input: AfipBillingDefaults) {
    writeAfipBillingDefaults(normalizeAfipBillingDefaults(input));
    return this.getStatus();
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
      clearPendingAfipCsr();

      const existing = readStoredAfipConfig();
      const config: AfipStoredConfig = {
        cuit,
        puntoVenta,
        production,
        updatedAt: new Date().toISOString(),
        billingDefaults: existing?.billingDefaults ?? readAfipBillingDefaults(),
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

  generateCsrAndSaveKey(input: GenerateAfipCsrInput) {
    const status = this.getStatus();

    if (status.hasCertificate) {
      throw new BadRequestException(
        'Ya hay un certificado configurado. Reiniciá las credenciales AFIP antes de generar una nueva clave.',
      );
    }

    try {
      const cuit = validateCuit(input.cuit);
      const organization = input.organization?.trim() || 'PointOfSale';
      const commonName = input.commonName?.trim() || 'PointOfSale';
      const csrInput = { cuit, organization, commonName };

      if (status.hasPrivateKey) {
        const pendingCsr = readPendingAfipCsr();
        if (pendingCsr) {
          const nextStatus = this.savePrivateKey({
            cuit,
            clavePrivada: readAfipPrivateKey(),
            puntoVenta: input.puntoVenta,
            production: input.production,
          });

          return {
            csr: pendingCsr,
            status: nextStatus,
            reusedExistingKey: true,
          };
        }

        const csrPem = generateAfipCsrFromPrivateKey(readAfipPrivateKey(), csrInput);
        writePendingAfipCsr(csrPem);

        const nextStatus = this.savePrivateKey({
          cuit,
          clavePrivada: readAfipPrivateKey(),
          puntoVenta: input.puntoVenta,
          production: input.production,
        });

        return {
          csr: csrPem,
          status: nextStatus,
          reusedExistingKey: true,
        };
      }

      const { privateKeyPem, csrPem } = generateAfipCsr(csrInput);
      writePendingAfipCsr(csrPem);

      const nextStatus = this.savePrivateKey({
        cuit,
        clavePrivada: privateKeyPem,
        puntoVenta: input.puntoVenta,
        production: input.production,
      });

      return {
        csr: csrPem,
        status: nextStatus,
        reusedExistingKey: false,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        error instanceof Error ? error.message : 'No se pudo generar el pedido CSR de AFIP',
      );
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

      const existing = readStoredAfipConfig();
      const config: AfipStoredConfig = {
        cuit,
        puntoVenta,
        production,
        updatedAt: new Date().toISOString(),
        billingDefaults: existing?.billingDefaults ?? readAfipBillingDefaults(),
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
      clearPendingAfipCsr();

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
