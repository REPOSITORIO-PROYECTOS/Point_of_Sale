import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('inventory_items')
export class InventoryItemEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  name!: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
