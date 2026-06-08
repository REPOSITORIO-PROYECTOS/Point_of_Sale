import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cash_movements')
export class CashMovementEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  description!: string;

  @Column('float')
  amount!: number;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
