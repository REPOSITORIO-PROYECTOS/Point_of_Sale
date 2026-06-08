import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('products')
export class ProductEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  name!: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
