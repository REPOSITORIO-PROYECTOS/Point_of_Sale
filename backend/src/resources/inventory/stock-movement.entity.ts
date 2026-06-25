import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type StockMovementType = 'in' | 'out' | 'transfer';

@Entity('stock_movements')
export class StockMovementEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  productId!: string;

  @Column({ type: 'text' })
  productName!: string;

  @Column({ type: 'text' })
  type!: StockMovementType;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ type: 'integer', nullable: true })
  stockBefore?: number | null;

  @Column({ type: 'integer', nullable: true })
  stockAfter?: number | null;

  @Column({ type: 'text', nullable: true })
  destinationLocal?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'text', nullable: true })
  userId?: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
