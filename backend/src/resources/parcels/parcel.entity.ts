import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

export const PARCEL_STATUSES = ['pending', 'picked-up', 'returned'] as const;
export type ParcelStatus = (typeof PARCEL_STATUSES)[number];

@Entity('parcels')
export class ParcelEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text' })
  customerName!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column('float')
  amount!: number;

  @Column({ type: 'text', default: 'pending' })
  status!: ParcelStatus;

  @Column({ type: 'text' })
  date!: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
