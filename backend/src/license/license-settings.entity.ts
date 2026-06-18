import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { LicenseStatus } from './license.types';

@Entity('license_settings')
export class LicenseSettingsEntity {
  @PrimaryColumn({ type: 'text', default: 'default' })
  id!: string;

  @Column({ type: 'text', nullable: true })
  licenseKey!: string | null;

  @Column({ type: 'text', nullable: true })
  licenseId!: string | null;

  @Column({ type: 'text', nullable: true })
  clientNumber!: string | null;

  @Column({ type: 'datetime', nullable: true })
  activatedAt!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'text', default: 'missing' })
  status!: LicenseStatus;

  @Column({ type: 'datetime' })
  firstBootAt!: Date;

  @Column({ type: 'boolean', default: false })
  cautionFlag!: boolean;
}
