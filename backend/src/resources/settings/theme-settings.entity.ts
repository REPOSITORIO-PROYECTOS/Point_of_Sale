import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('theme_settings')
export class ThemeSettingsEntity {
  @PrimaryColumn({ type: 'text', default: 'default' })
  id!: string;

  @Column({ type: 'text', default: '#030213' })
  primaryColor!: string;

  @Column({ type: 'text', nullable: true })
  logoUrl?: string | null;

  @Column({ type: 'integer', default: 80 })
  receiptWidthMm!: number;

  @UpdateDateColumn({ type: 'text' })
  updatedAt!: string;
}
