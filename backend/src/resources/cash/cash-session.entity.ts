import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('cash_sessions')
export class CashSessionEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'datetime' })
  startTime!: Date;

  @Column({ type: 'datetime', nullable: true })
  endTime?: Date | null;

  @Column('float')
  initialBalance!: number;

  @Column('float', { nullable: true })
  finalBalance?: number | null;

  @Column('float', { nullable: true })
  countedAmount?: number | null;

  @Column('float', { default: 0 })
  totalSales!: number;

  @Column({ type: 'text', default: '{}' })
  salesByPaymentMethod!: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
