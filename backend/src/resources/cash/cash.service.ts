import {

  BadRequestException,

  ConflictException,

  Injectable,

  NotFoundException,

} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { In, IsNull, Not, type EntityManager, Repository } from 'typeorm';

import { UserEntity, type UserRole } from '@/auth/user.entity';

import { SaleEntity } from '@/resources/sales/sale.entity';

import { CashSessionEntity } from './cash-session.entity';

import { CloseCashSessionDto } from './dto/close-cash-session.dto';

import { CreateCashMovementDto } from './dto/create-cash-movement.dto';

import { FindCashClosingsDto } from './dto/find-cash-closings.dto';

import { StartCashSessionDto } from './dto/start-cash-session.dto';

import { CashMovementEntity } from './cash-movement.entity';

import {
  computeExpectedSessionBalance,
  computeSessionMovementTotals,
  type SessionMovementTotals,
} from './cash-movement-totals';



export type CashSessionResponse = {

  id: string;

  startTime: string;

  endTime?: string;

  initialBalance: number;

  finalBalance?: number;

  countedAmount?: number;

  totalSales: number;

  salesByPaymentMethod?: {

    cash: number;

    card: number;

    transfer: number;

    qr: number;

  };

  movementTotals?: SessionMovementTotals;

};



export type CashClosingStatus = 'perfect' | 'surplus' | 'shortage';



export type CashClosingSummary = {

  id: string;

  date: string;

  user: string;

  userId?: string;

  userRole: string;

  expectedAmount: number;

  countedAmount: number;

  difference: number;

  status: CashClosingStatus;

  totalSales: number;

  transactionsCount: number;

  salesByMethod: PaymentBreakdown;

  movementTotals?: SessionMovementTotals;

};



export type CashClosingDetail = CashClosingSummary & {

  sales: Array<{

    id: string;

    time: string;

    items: Array<{ id: string; name: string; quantity: number; price: number }>;

    paymentMethod: string;

    paymentDetails?: Array<{ method: string; amount: number }>;

    subtotal: number;

    amount: number;

    cashier: string;

    cashierRole: string;

  }>;

  movements: Array<{

    id: number;

    description: string;

    amount: number;

    type: 'income' | 'expense';

    paymentMethod: string;

    createdAt: string;

  }>;

  businessData: {

    name: string;

    rut: string;

    phone: string;

    email: string;

    address: string;

  };

};



export type CashClosingsPage = {

  items: CashClosingSummary[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;

  cashiers: Array<{ id: string; username: string; role: UserRole }>;

};



export type CashSessionHistoryItem = {
  id: string;
  startTime: string;
  endTime?: string;
  initialBalance: number;
  expectedBalance?: number;
  countedAmount?: number;
  totalSales: number;
  salesByPaymentMethod?: PaymentBreakdown;
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

    @InjectRepository(UserEntity)

    private readonly userRepository: Repository<UserEntity>,

  ) {}



  findAllMovements(sessionId?: string) {

    return this.movementRepository.find({
      where: sessionId ? { cashSessionId: sessionId } : undefined,
      order: { createdAt: 'DESC' },
    });

  }



  async createMovement(payload: CreateCashMovementDto, userId?: string) {

    const session = await this.getOpenSession();



    if (!session) {

      throw new BadRequestException('Cannot record movement without an open cash session');

    }



    const movementType = payload.type ?? 'income';

    const signedAmount =

      movementType === 'expense' ? -Math.abs(payload.amount) : Math.abs(payload.amount);



    const entity = this.movementRepository.create({

      description: payload.description,

      amount: signedAmount,

      type: movementType,

      paymentMethod: payload.paymentMethod ?? 'cash',

      cashSessionId: session.id,

      userId: userId ?? null,

    });



    return this.movementRepository.save(entity);

  }



  async getSession(): Promise<CashSessionResponse | null> {
    const openSession = await this.getOpenSession();

    if (!openSession) {
      return null;
    }

    return toSessionResponse(openSession, await this.getMovementTotalsForSession(openSession.id));
  }



  async getOpenSession() {

    return this.sessionRepository.findOne({

      where: { endTime: IsNull() },

      order: { startTime: 'DESC' },

    });

  }

  /** Cierra sesiones abiertas huérfanas al completar la configuración inicial (sin usuarios previos). */
  async closeOrphanOpenSessionsForFirstSetup(manager: EntityManager) {
    const openSessions = await manager.find(CashSessionEntity, {
      where: { endTime: IsNull() },
    });

    if (openSessions.length === 0) {
      return;
    }

    const now = new Date();

    for (const session of openSessions) {
      const movementTotals = await this.getMovementTotalsForSession(session.id);
      const expectedBalance = computeExpectedSessionBalance(
        session.initialBalance,
        session.totalSales,
        movementTotals,
      );

      session.endTime = now;
      session.finalBalance = expectedBalance;
      session.countedAmount = expectedBalance;
      session.closedByUserId = null;
      await manager.save(CashSessionEntity, session);
    }
  }



  async startSession(payload: StartCashSessionDto, userId?: string) {

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

      openedByUserId: userId ?? null,

      closedByUserId: null,

    });



    const saved = await this.sessionRepository.save(entity);

    return toSessionResponse(saved, emptyMovementTotals());

  }



  async closeSession(payload: CloseCashSessionDto, userId?: string) {

    const session = await this.getOpenSession();



    if (!session) {

      throw new NotFoundException('No open cash session found');

    }



    const movementTotals = await this.getMovementTotalsForSession(session.id);

    const expectedBalance = computeExpectedSessionBalance(

      session.initialBalance,

      session.totalSales,

      movementTotals,

    );



    session.endTime = new Date();

    session.finalBalance = expectedBalance;

    session.countedAmount = payload.countedAmount;

    session.closedByUserId = userId ?? session.openedByUserId ?? null;



    const saved = await this.sessionRepository.save(session);

    return toSessionResponse(saved, movementTotals);

  }



  async findClosings(query: FindCashClosingsDto): Promise<CashClosingsPage> {

    const page = query.page ?? 1;

    const pageSize = query.pageSize ?? 10;

    const skip = (page - 1) * pageSize;



    const qb = this.sessionRepository
      .createQueryBuilder('session')
      .where('session.endTime IS NOT NULL');

    if (query.search?.trim()) {
      qb.leftJoin(
        UserEntity,
        'user',
        'user.id = COALESCE(session.closedByUserId, session.openedByUserId)',
      ).andWhere('LOWER(user.username) LIKE LOWER(:search)', {
        search: `%${query.search.trim()}%`,
      });
    }

    if (query.userId && query.userId !== 'all') {

      qb.andWhere(
        '(session.closedByUserId = :userId OR session.openedByUserId = :userId)',
        { userId: query.userId },
      );

    }



    if (query.dateFrom) {

      const from = new Date(query.dateFrom);

      if (Number.isNaN(from.getTime())) {

        throw new BadRequestException('dateFrom is not a valid date');

      }

      qb.andWhere('session.endTime >= :dateFrom', { dateFrom: from });

    }



    if (query.dateTo) {

      const to = new Date(query.dateTo);

      if (Number.isNaN(to.getTime())) {

        throw new BadRequestException('dateTo is not a valid date');

      }

      to.setHours(23, 59, 59, 999);

      qb.andWhere('session.endTime <= :dateTo', { dateTo: to });

    }



    const [sessions, total] = await qb

      .orderBy('session.endTime', 'DESC')

      .skip(skip)

      .take(pageSize)

      .getManyAndCount();



    const sessionIds = sessions.map((session) => session.id);

    const saleCounts = await this.getSaleCountsBySession(sessionIds);

    const cashierMap = await this.resolveCashiersForSessions(sessions);



    const movementTotalsBySession = await this.getMovementTotalsBySessions(sessionIds);



    const items = sessions.map((session) =>

      toClosingSummary(

        session,

        saleCounts.get(session.id) ?? 0,

        cashierMap.get(session.id),

        movementTotalsBySession.get(session.id),

      ),

    );



    const cashiers = await this.getClosingCashiers();



    return {

      items,

      total,

      page,

      pageSize,

      totalPages: Math.max(1, Math.ceil(total / pageSize)),

      cashiers,

    };

  }



  async listClosedSessions(limit: number): Promise<CashSessionHistoryItem[]> {
    const boundedLimit = Math.min(Math.max(limit, 1), 100);
    const sessions = await this.sessionRepository.find({
      where: { endTime: Not(IsNull()) },
      order: { endTime: 'DESC' },
      take: boundedLimit,
    });

    if (sessions.length === 0) {
      return [];
    }

    const sessionIds = sessions.map((session) => session.id);
    const [saleCounts, cashierMap] = await Promise.all([
      this.getSaleCountsBySession(sessionIds),
      this.resolveCashiersForSessions(sessions),
    ]);

    return sessions.map((session) => {
      const response = toSessionResponse(session);
      const cashier = cashierMap.get(session.id);

      return {
        id: response.id,
        startTime: response.startTime,
        ...(response.endTime ? { endTime: response.endTime } : {}),
        initialBalance: response.initialBalance,
        ...(response.finalBalance != null ? { expectedBalance: response.finalBalance } : {}),
        ...(response.countedAmount != null ? { countedAmount: response.countedAmount } : {}),
        totalSales: response.totalSales,
        salesByPaymentMethod: response.salesByPaymentMethod,
        isOpen: false,
        ...(cashier?.user ? { closedByUsername: cashier.user } : {}),
        ...(cashier?.userRole ? { closedByRole: cashier.userRole } : {}),
        transactionsCount: saleCounts.get(session.id) ?? 0,
      };
    });
  }



  async getClosingDetail(id: string): Promise<CashClosingDetail> {

    const session = await this.sessionRepository.findOne({ where: { id, endTime: Not(IsNull()) } });



    if (!session) {

      throw new NotFoundException('Cash closing not found');

    }



    const [saleCounts, cashierMap, sales, usersById, movements, movementTotals] = await Promise.all([

      this.getSaleCountsBySession([session.id]),

      this.resolveCashiersForSessions([session]),

      this.saleRepository.find({

        where: { cashSessionId: session.id },

        order: { timestamp: 'ASC' },

      }),

      this.loadUsersForSales(session.id),

      this.movementRepository.find({

        where: { cashSessionId: session.id },

        order: { createdAt: 'ASC' },

      }),

      this.getMovementTotalsForSession(session.id),

    ]);



    const summary = toClosingSummary(

      session,

      saleCounts.get(session.id) ?? 0,

      cashierMap.get(session.id),

      movementTotals,

    );



    return {

      ...summary,

      businessData: {

        name: 'Mi Negocio',

        rut: '',

        phone: '',

        email: '',

        address: '',

      },

      sales: sales.map((sale) => {

        const items = JSON.parse(sale.items) as Array<{

          id: string;

          name: string;

          quantity: number;

          price: number;

        }>;

        const payments = sale.payments

          ? (JSON.parse(sale.payments) as Array<{ type: string; amount: number }>)

          : undefined;

        const user = sale.userId ? usersById.get(sale.userId) : undefined;

        const paymentMethod =

          payments && payments.length > 1 ? 'mixed' : payments?.[0]?.type ?? 'cash';



        return {

          id: sale.id,

          time: formatTime(sale.timestamp),

          items,

          paymentMethod,

          ...(payments && payments.length > 0

            ? {

                paymentDetails: payments.map((payment) => ({

                  method: payment.type,

                  amount: payment.amount,

                })),

              }

            : {}),

          subtotal: sale.total,

          amount: sale.total,

          cashier: user?.username ?? summary.user,

          cashierRole: formatRoleLabel(user?.role ?? summary.userRole),

        };

      }),

      movements: movements.map((movement) => toClosingMovement(movement)),

    };

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



  private async getMovementTotalsForSession(sessionId: string): Promise<SessionMovementTotals> {

    const movements = await this.movementRepository.find({ where: { cashSessionId: sessionId } });

    return computeSessionMovementTotals(movements);

  }



  private async getMovementTotalsBySessions(

    sessionIds: string[],

  ): Promise<Map<string, SessionMovementTotals>> {

    const totals = new Map<string, SessionMovementTotals>();



    if (sessionIds.length === 0) {

      return totals;

    }



    const movements = await this.movementRepository.find({

      where: { cashSessionId: In(sessionIds) },

    });



    for (const sessionId of sessionIds) {

      totals.set(sessionId, emptyMovementTotals());

    }



    const grouped = new Map<string, CashMovementEntity[]>();

    for (const movement of movements) {

      if (!movement.cashSessionId) {

        continue;

      }

      const bucket = grouped.get(movement.cashSessionId) ?? [];

      bucket.push(movement);

      grouped.set(movement.cashSessionId, bucket);

    }



    for (const [sessionId, sessionMovements] of grouped) {

      totals.set(sessionId, computeSessionMovementTotals(sessionMovements));

    }



    return totals;

  }



  private async getSaleCountsBySession(sessionIds: string[]): Promise<Map<string, number>> {

    const counts = new Map<string, number>();



    if (sessionIds.length === 0) {

      return counts;

    }



    const rows = await this.saleRepository

      .createQueryBuilder('sale')

      .select('sale.cashSessionId', 'sessionId')

      .addSelect('COUNT(*)', 'count')

      .where('sale.cashSessionId IN (:...sessionIds)', { sessionIds })

      .groupBy('sale.cashSessionId')

      .getRawMany<{ sessionId: string; count: string }>();



    for (const row of rows) {

      counts.set(row.sessionId, Number(row.count));

    }



    return counts;

  }



  private async resolveCashiersForSessions(

    sessions: CashSessionEntity[],

  ): Promise<Map<string, { user: string; userId?: string; userRole: string }>> {

    const result = new Map<string, { user: string; userId?: string; userRole: string }>();

    const userIds = [

      ...new Set(

        sessions

          .map((session) => session.closedByUserId ?? session.openedByUserId)

          .filter((value): value is string => Boolean(value)),

      ),

    ];



    const users = userIds.length > 0 ? await this.userRepository.findBy({ id: In(userIds) }) : [];

    const usersById = new Map(users.map((user) => [user.id, user]));



    const sessionsWithoutUser = sessions.filter(

      (session) => !session.closedByUserId && !session.openedByUserId,

    );



    const fallbackUsers = new Map<string, UserEntity>();

    if (sessionsWithoutUser.length > 0) {

      const rows = await this.saleRepository
        .createQueryBuilder('sale')
        .select('sale.cashSessionId', 'sessionId')
        .addSelect('sale.userId', 'userId')
        .addSelect('COUNT(*)', 'count')
        .where('sale.cashSessionId IN (:...sessionIds)', {
          sessionIds: sessionsWithoutUser.map((session) => session.id),
        })
        .andWhere('sale.userId IS NOT NULL')
        .groupBy('sale.cashSessionId')
        .addGroupBy('sale.userId')
        .getRawMany<{ sessionId: string; userId: string; count: string }>();

      const bestBySession = new Map<string, { userId: string; count: number }>();
      for (const row of rows) {
        const count = Number(row.count);
        const current = bestBySession.get(row.sessionId);
        if (!current || count > current.count) {
          bestBySession.set(row.sessionId, { userId: row.userId, count });
        }
      }

      const fallbackUserIds = [...new Set([...bestBySession.values()].map((entry) => entry.userId))];
      if (fallbackUserIds.length > 0) {
        const loaded = await this.userRepository.findBy({ id: In(fallbackUserIds) });
        for (const user of loaded) {
          fallbackUsers.set(user.id, user);
        }
      }

      for (const [sessionId, entry] of bestBySession) {
        const user = fallbackUsers.get(entry.userId);
        if (user) {
          result.set(sessionId, {
            user: user.username,
            userId: user.id,
            userRole: formatRoleLabel(user.role),
          });
        }
      }

    }



    for (const session of sessions) {

      if (result.has(session.id)) {

        continue;

      }



      const userId = session.closedByUserId ?? session.openedByUserId;

      const user = userId ? usersById.get(userId) : undefined;



      result.set(session.id, {

        user: user?.username ?? 'Sin asignar',

        ...(user ? { userId: user.id } : {}),

        userRole: user ? formatRoleLabel(user.role) : 'Cajero',

      });

    }



    return result;

  }



  private async getClosingCashiers(): Promise<Array<{ id: string; username: string; role: UserRole }>> {

    const rows = await this.sessionRepository
      .createQueryBuilder('session')
      .leftJoin(
        UserEntity,
        'user',
        'user.id = COALESCE(session.closedByUserId, session.openedByUserId)',
      )
      .select('user.id', 'id')
      .addSelect('user.username', 'username')
      .addSelect('user.role', 'role')
      .distinct(true)
      .where('session.endTime IS NOT NULL')
      .andWhere('user.id IS NOT NULL')
      .orderBy('user.username', 'ASC')
      .getRawMany<{ id: string; username: string; role: UserRole }>();



    return rows.filter((row) => Boolean(row.id));

  }



  private async loadUsersForSales(sessionId: string): Promise<Map<string, UserEntity>> {

    const sales = await this.saleRepository.find({

      where: { cashSessionId: sessionId },

      select: ['userId'],

    });

    const userIds = [...new Set(sales.map((sale) => sale.userId).filter((id): id is string => Boolean(id)))];



    if (userIds.length === 0) {

      return new Map();

    }



    const users = await this.userRepository.findBy({ id: In(userIds) });

    return new Map(users.map((user) => [user.id, user]));

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



function emptyMovementTotals(): SessionMovementTotals {

  return {

    incomeTotal: 0,

    expenseTotal: 0,

    netTotal: 0,

    cashIncome: 0,

    cashExpense: 0,

    cashNet: 0,

  };

}



function toSessionResponse(

  entity: CashSessionEntity,

  movementTotals: SessionMovementTotals = emptyMovementTotals(),

): CashSessionResponse {

  const breakdown = parsePaymentBreakdown(entity.salesByPaymentMethod);



  return {

    id: entity.id,

    startTime: entity.startTime.toISOString(),

    ...(entity.endTime ? { endTime: entity.endTime.toISOString() } : {}),

    initialBalance: entity.initialBalance ?? 0,

    ...(entity.finalBalance != null ? { finalBalance: entity.finalBalance } : {}),

    ...(entity.countedAmount != null ? { countedAmount: entity.countedAmount } : {}),

    totalSales: entity.totalSales ?? 0,

    salesByPaymentMethod: breakdown,

    movementTotals,

  };

}



function toClosingMovement(movement: CashMovementEntity) {

  const type = movement.type ?? (movement.amount >= 0 ? 'income' : 'expense');

  return {

    id: movement.id,

    description: movement.description,

    amount: movement.amount,

    type: type as 'income' | 'expense',

    paymentMethod: movement.paymentMethod ?? 'cash',

    createdAt: movement.createdAt.toISOString(),

  };

}



function toClosingSummary(

  entity: CashSessionEntity,

  transactionsCount: number,

  cashier?: { user: string; userId?: string; userRole: string },

  movementTotals: SessionMovementTotals = emptyMovementTotals(),

): CashClosingSummary {

  const expectedAmount =

    entity.finalBalance ??

    computeExpectedSessionBalance(entity.initialBalance, entity.totalSales ?? 0, movementTotals);

  const countedAmount = entity.countedAmount ?? expectedAmount;

  const difference = countedAmount - expectedAmount;

  const status = resolveClosingStatus(difference);



  return {

    id: entity.id,

    date: entity.endTime!.toISOString(),

    user: cashier?.user ?? 'Sin asignar',

    ...(cashier?.userId ? { userId: cashier.userId } : {}),

    userRole: cashier?.userRole ?? 'Cajero',

    expectedAmount,

    countedAmount,

    difference,

    status,

    totalSales: entity.totalSales ?? 0,

    transactionsCount,

    salesByMethod: parsePaymentBreakdown(entity.salesByPaymentMethod),

    movementTotals,

  };

}



function resolveClosingStatus(difference: number): CashClosingStatus {

  if (Math.abs(difference) < 0.01) {

    return 'perfect';

  }



  return difference > 0 ? 'surplus' : 'shortage';

}



function formatRoleLabel(role: UserRole | string): string {

  const labels: Record<string, string> = {

    admin: 'Administrador',

    manager: 'Gerente',

    cashier: 'Cajero',

    auditor: 'Auditor',

  };



  return labels[role] ?? role;

}



function formatTime(value: Date): string {

  return value.toLocaleTimeString('es-AR', {

    hour: '2-digit',

    minute: '2-digit',

    hour12: false,

  });

}


