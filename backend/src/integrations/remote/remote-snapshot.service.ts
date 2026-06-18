import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Not, Repository } from 'typeorm';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { LicenseService } from '@/license/license.service';
import { CashSessionEntity } from '@/resources/cash/cash-session.entity';
import { CashService } from '@/resources/cash/cash.service';
import { ProductEntity } from '@/resources/products/product.entity';
import { SaleEntity } from '@/resources/sales/sale.entity';
import {
  buildRegisterSnapshot,
  mapLicenseStatus,
  type RegisterSnapshot,
  type RemoteLicenseStatus,
} from './remote-snapshot.builder';

@Injectable()
export class RemoteSnapshotService {
  private readonly logger = new Logger(RemoteSnapshotService.name);
  private readonly agentVersion = readPackageVersion();

  constructor(
    private readonly cashService: CashService,
    private readonly licenseService: LicenseService,
    @InjectRepository(SaleEntity)
    private readonly saleRepository: Repository<SaleEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
  ) {}

  async buildSnapshot(config: {
    registerId: string;
    clientNumber: string;
    registerLabel: string;
  }): Promise<RegisterSnapshot> {
    try {
      const [openSession, salesToday, stockAlerts, licenseStatus] = await Promise.all([
        this.cashService.getOpenSession(),
        this.getSalesTodaySummary(),
        this.countStockAlerts(),
        this.getLicenseStatus(),
      ]);

      return buildRegisterSnapshot({
        registerId: config.registerId,
        clientNumber: config.clientNumber,
        label: config.registerLabel,
        cashSession: toCashSessionSnapshot(openSession),
        salesToday,
        stockAlerts,
        licenseStatus,
        agentVersion: this.agentVersion,
      });
    } catch (error) {
      this.logger.warn(`Falling back to structured mock snapshot: ${String(error)}`);
      return buildRegisterSnapshot({
        registerId: config.registerId,
        clientNumber: config.clientNumber,
        label: config.registerLabel,
        cashSession: { open: false },
        salesToday: { count: 0, total: 0 },
        stockAlerts: 0,
        licenseStatus: 'invalid',
        agentVersion: this.agentVersion,
      });
    }
  }

  private async getSalesTodaySummary(): Promise<{ count: number; total: number }> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const sales = await this.saleRepository.find({
      where: { timestamp: Between(start, end) },
      select: ['total'],
    });

    return {
      count: sales.length,
      total: sales.reduce((sum, sale) => sum + sale.total, 0),
    };
  }

  private async countStockAlerts(): Promise<number> {
    const products = await this.productRepository.find({
      where: { minStock: Not(IsNull()) },
      select: ['stock', 'minStock'],
    });

    return products.filter((product) => {
      if (product.minStock == null) {
        return false;
      }

      const stock = product.stock ?? 0;
      return stock <= product.minStock;
    }).length;
  }

  private async getLicenseStatus(): Promise<RemoteLicenseStatus> {
    const status = await this.licenseService.getStatus();
    return mapLicenseStatus(status.status, status.inGracePeriod);
  }
}

function toCashSessionSnapshot(session: CashSessionEntity | null) {
  if (!session) {
    return { open: false };
  }

  return {
    open: true,
    openedAt: session.startTime.toISOString(),
    openingBalance: session.initialBalance,
    salesTotal: session.totalSales,
    expectedBalance: session.initialBalance + session.totalSales,
  };
}

function readPackageVersion(): string {
  try {
    const packagePath = path.resolve(__dirname, '../../../package.json');
    const raw = readFileSync(packagePath, 'utf8');
    return (JSON.parse(raw) as { version: string }).version;
  } catch {
    return '0.0.1';
  }
}
