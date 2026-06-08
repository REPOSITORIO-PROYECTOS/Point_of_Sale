import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sales')
export class SaleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  productId!: string;

  @Column({ type: 'integer' })
  quantity!: number;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
