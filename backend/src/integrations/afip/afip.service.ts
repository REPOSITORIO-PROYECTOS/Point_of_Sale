import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { env } from '@/config/env.config';
import { AfipConfigService } from './afip-config.service';
import { bindAfipConfigService } from './afip.credentials';
import type {
  AfipHealthResponse,
  AfipIssueInvoicePayload,
  AfipIssueInvoiceResponse,
  AfipMicroserviceInvoiceRequest,
  AfipQueryVoucherParams,
  AfipQueryVoucherResponse,
} from './afip.types';
import {
  AFIP_CONSULTA_PATH,
  AFIP_FACTURADOR_PATH,
  AFIP_TEST_PATHS,
} from './afip.types';

@Injectable()
export class AfipService implements OnModuleInit {
  private readonly logger = new Logger(AfipService.name);
  private readonly baseUrl = env.afipServiceUrl.replace(/\/$/, '');

  constructor(private readonly afipConfigService: AfipConfigService) {}

  onModuleInit() {
    bindAfipConfigService(this.afipConfigService);
  }

  get serviceUrl() {
    return this.baseUrl;
  }

  isConfigured() {
    return Boolean(env.afipServiceUrl);
  }

  hasCredentialsConfigured() {
    return this.afipConfigService.isConfigured();
  }

  buildMicroserviceInvoiceRequest(payload: AfipIssueInvoicePayload): AfipMicroserviceInvoiceRequest {
    const config = this.afipConfigService.getStatus();

    return {
      credenciales: this.afipConfigService.loadCredentials(),
      datos_factura: {
        ...payload,
        punto_venta: payload.punto_venta ?? config.puntoVenta ?? env.afipPuntoVenta,
      },
    };
  }

  async healthCheck(): Promise<AfipHealthResponse> {
    const startedAt = Date.now();

    for (const testPath of AFIP_TEST_PATHS) {
      const url = `${this.baseUrl}${testPath}`;

      try {
        const response = await fetch(url, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          return {
            afipReachable: true,
            url: this.baseUrl,
            latencyMs: Date.now() - startedAt,
            statusCode: response.status,
            error: null,
            checkedAt: new Date().toISOString(),
            matchedPath: testPath,
          };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown AFIP health error';
        this.logger.debug(`AFIP health probe failed for ${testPath}: ${message}`);
      }
    }

    return {
      afipReachable: false,
      url: this.baseUrl,
      latencyMs: Date.now() - startedAt,
      statusCode: null,
      error: 'AFIP microservice unreachable on known health paths',
      checkedAt: new Date().toISOString(),
      matchedPath: null,
    };
  }

  async issueInvoice(payload: AfipIssueInvoicePayload): Promise<AfipIssueInvoiceResponse> {
    const body = this.buildMicroserviceInvoiceRequest(payload);

    const response = await fetch(`${this.baseUrl}${AFIP_FACTURADOR_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    const data = (await response.json().catch(() => ({}))) as AfipIssueInvoiceResponse;

    if (!response.ok) {
      throw new Error(`AFIP facturador error (${response.status}): ${JSON.stringify(data)}`);
    }

    return data;
  }

  async queryVoucher(params: AfipQueryVoucherParams): Promise<AfipQueryVoucherResponse> {
    const query = new URLSearchParams({
      tipo_cbte: String(params.tipo_cbte),
      punto_vta: String(params.punto_vta),
      cbte_nro: String(params.cbte_nro),
    });

    const response = await fetch(`${this.baseUrl}${AFIP_CONSULTA_PATH}?${query}`, {
      method: 'GET',
      signal: AbortSignal.timeout(15000),
    });

    const data = (await response.json()) as AfipQueryVoucherResponse;

    if (!response.ok) {
      throw new Error(`AFIP consulta error (${response.status}): ${JSON.stringify(data)}`);
    }

    return data;
  }
}
