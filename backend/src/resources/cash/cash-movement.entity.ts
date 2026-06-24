import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type CashMovementType = 'income' | 'expense';
export type CashMovementPaymentMethod = 'cash' | 'card' | 'transfer' | 'qr';

@Entity('cash_movements')
export class CashMovementEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  description!: string;

  @Column('float')
  amount!: number;

  @Column({ type: 'text', nullable: true })
  cashSessionId?: string | null;

  @Column({ type: 'text', nullable: true })
  type?: CashMovementType | null;

  @Column({ type: 'text', nullable: true, default: 'cash' })
  paymentMethod?: CashMovementPaymentMethod | null;

  @Column({ type: 'text', nullable: true })
  userId?: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
