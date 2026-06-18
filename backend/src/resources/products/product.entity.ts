import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export const PRODUCT_UNITS = [
  'unidad',
  'gramos',
  'kilogramos',
  'litros',
  'mililitros',
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];

@Entity('products')
export class ProductEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column('float', { default: 0 })
  price!: number;

  @Column('float', { nullable: true })
  cost?: number | null;

  @Column({ type: 'text', default: '[]' })
  categories!: string;

  @Column({ type: 'integer', nullable: true })
  stock?: number | null;

  @Column({ type: 'integer', nullable: true })
  minStock?: number | null;

  @Column({ type: 'text', nullable: true })
  image?: string | null;

  @Column({ type: 'text', nullable: true })
  barcodes?: string | null;

  @Column({ type: 'text', default: 'unidad' })
  unit!: ProductUnit;

  @Column('float', { nullable: true })
  quantity?: number | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
