import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { CashSessionEntity } from './cash-session.entity';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { StartCashSessionDto } from './dto/start-cash-session.dto';
import { CashMovementEntity } from './cash-movement.entity';
import { SaleEntity } from '../sales/sale.entity';

export type CashSessionCloser = {
  username: string;
  role: string;
};

export type CashSessionResponse = {
  id: string;
  startTime: string;
  endTime?: string;
  initialBalance: number;
  expectedBalance?: number;
  countedAmount?: number;
  totalSales: number;
  salesByPaymentMethod?: {
    cash: number;
    card: number;
    transfer: number;
    qr: number;
  };
  isOpen?: boolean;
  closedByUsername?: string;
  closedByRole?: string;
  transactionsCount?: number;
};

type PaymentBreakdown = NonNullable<CashSessionResponse['salesByPaymentMethod']>;

@Injectable()
export class CashService {
  constructor(
    @InjectRepository(CashMovementEntity)
    private readonly movementRepository: Repository<CashMovementEntity>,
    @InjectRepository(CashSessionEntity)
    private readonly sessionRepository: Repository<CashSessionEntity>,
    @InjectRepository(SaleEntity)
    private readonly saleRepository: Repository<SaleEntity>,
  ) {}

  findAllMovements() {
    return this.movementRepository.find({ order: { id: 'DESC' } });
  }

  createMovement(payload: CreateCashMovementDto) {
    const entity = this.movementRepository.create(payload);
    return this.movementRepository.save(entity);
  }

  async getSession(): Promise<CashSessionResponse | null> {
    const openSession = await this.sessionRepository.findOne({
      where: { endTime: IsNull() },
      order: { startTime: 'DESC' },
    });

    if (openSession) {
      return toSessionResponse(openSession);
    }

    const latestSession = await this.sessionRepository.find({
      order: { startTime: 'DESC' },
      take: 1,
    });

    return latestSession[0] ? toSessionResponse(latestSession[0]) : null;
  }

  async getOpenSession() {
    return this.sessionRepository.findOne({
      where: { endTime: IsNull() },
      order: { startTime: 'DESC' },
    });
  }

  async startSession(payload: StartCashSessionDto) {
    const openSession = await this.getOpenSession();

    if (openSession) {
      throw new ConflictException('There is already an open cash session');
    }

    const entity = this.sessionRepository.create({
      id: Date.now().toString(),
      startTime: new Date(),
      initialBalance: payload.initialBalance,
      totalSales: 0,
      salesByPaymentMethod: JSON.stringify(emptyPaymentBreakdown()),
    });

    const saved = await this.sessionRepository.save(entity);
    return toSessionResponse(saved);
  }

  async listClosedSessions(limit = 100): Promise<CashSessionResponse[]> {
    const closedSessions = await this.sessionRepository.find({
      where: { endTime: Not(IsNull()) },
      order: { endTime: 'DESC' },
      take: limit,
    });

    if (closedSessions.length === 0) {
      return [];
    }

    const sessionIds = closedSessions.map((session) => session.id);
    const saleCounts = await this.saleRepository
      .createQueryBuilder('sale')
      .select('sale.cashSessionId', 'sessionId')
      .addSelect('COUNT(*)', 'count')
      .where('sale.cashSessionId IN (:...sessionIds)', { sessionIds })
      .groupBy('sale.cashSessionId')
      .getRawMany<{ sessionId: string; count: string }>();

    const countBySession = new Map(
      saleCounts.map((row) => [row.sessionId, Number.parseInt(row.count, 10)]),
    );

    return closedSessions.map((session) =>
      toSessionResponse(session, countBySession.get(session.id) ?? 0),
    );
  }

  async closeSession(payload: CloseCashSessionDto, closedBy?: CashSessionCloser) {
    const session = await this.getOpenSession();

    if (!session) {
      throw new NotFoundException('No open cash session found');
    }

    const expectedBalance = payload.expectedBalance ?? session.initialBalance + session.totalSales;

    session.endTime = new Date();
    session.finalBalance = expectedBalance;
    session.countedAmount = payload.countedAmount;

    if (closedBy) {
      session.closedByUsername = closedBy.username;
      session.closedByRole = closedBy.role;
    }

    const saved = await this.sessionRepository.save(session);
    const transactionsCount = await this.saleRepository.count({
      where: { cashSessionId: saved.id },
    });

    return toSessionResponse(saved, transactionsCount);
  }

  async recordSale(
    sessionId: string,
    total: number,
    payments?: Array<{ type: keyof PaymentBreakdown; amount: number }>,
  ) {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId } });

    if (!session || session.endTime) {
      throw new BadRequestException('Cannot record sale without an open cash session');
    }

    session.totalSales += total;

    const breakdown = parsePaymentBreakdown(session.salesByPaymentMethod);

    if (payments && payments.length > 0) {
      for (const payment of payments) {
        breakdown[payment.type] += payment.amount;
      }
    } else {
      breakdown.cash += total;
    }

    session.salesByPaymentMethod = JSON.stringify(breakdown);
    await this.sessionRepository.save(session);
  }
}

function emptyPaymentBreakdown(): PaymentBreakdown {
  return { cash: 0, card: 0, transfer: 0, qr: 0 };
}

function parsePaymentBreakdown(value: string | null | undefined): PaymentBreakdown {
  if (!value) {
    return emptyPaymentBreakdown();
  }

  try {
    const parsed = JSON.parse(value) as Partial<PaymentBreakdown>;
    return {
      cash: parsed.cash ?? 0,
      card: parsed.card ?? 0,
      transfer: parsed.transfer ?? 0,
      qr: parsed.qr ?? 0,
    };
  } catch {
    return emptyPaymentBreakdown();
  }
}

function toSessionResponse(
  entity: CashSessionEntity,
  transactionsCount?: number,
): CashSessionResponse {
  const breakdown = parsePaymentBreakdown(entity.salesByPaymentMethod);
  const isOpen = entity.endTime == null;
  const expectedBalance =
    entity.finalBalance ?? entity.initialBalance + entity.totalSales;

  return {
    id: entity.id,
    startTime: entity.startTime.toISOString(),
    ...(entity.endTime ? { endTime: entity.endTime.toISOString() } : {}),
    initialBalance: entity.initialBalance,
    ...(!isOpen ? { expectedBalance } : {}),
    ...(entity.countedAmount != null
      ? { countedAmount: entity.countedAmount, finalBalance: entity.countedAmount }
      : {}),
    totalSales: entity.totalSales,
    salesByPaymentMethod: breakdown,
    isOpen,
    ...(entity.closedByUsername ? { closedByUsername: entity.closedByUsername } : {}),
    ...(entity.closedByRole ? { closedByRole: entity.closedByRole } : {}),
    ...(transactionsCount != null ? { transactionsCount } : {}),
  };
}
