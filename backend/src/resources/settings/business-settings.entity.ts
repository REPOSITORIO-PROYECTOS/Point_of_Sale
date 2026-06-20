import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('business_settings')
export class BusinessSettingsEntity {
  @PrimaryColumn({ type: 'text', default: 'default' })
  id!: string;

  @Column({ type: 'text', nullable: true })
  businessName?: string | null;

  @Column({ type: 'text', nullable: true })
  taxId?: string | null;

  @Column({ type: 'text', nullable: true })
  phone?: string | null;

  @Column({ type: 'text', nullable: true })
  email?: string | null;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ type: 'boolean', default: false })
  parcelsEnabled!: boolean;

  @UpdateDateColumn({ type: 'text' })
  updatedAt!: string;
}
