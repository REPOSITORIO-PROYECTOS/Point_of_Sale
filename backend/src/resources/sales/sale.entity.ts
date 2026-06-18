import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('sales')
export class SaleEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text' })
  items!: string;

  @Column('float')
  total!: number;

  @Column({ type: 'text', nullable: true })
  payments?: string | null;

  @Column({ type: 'text', nullable: true })
  voucherType?: string | null;

  @Column({ type: 'text', nullable: true })
  cashSessionId?: string | null;

  @Column({ type: 'text', nullable: true })
  userId?: string | null;

  @Column({ type: 'datetime' })
  timestamp!: Date;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
