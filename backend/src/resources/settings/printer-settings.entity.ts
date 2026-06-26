import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('printer_settings')
export class PrinterSettingsEntity {
  @PrimaryColumn({ type: 'text', default: 'default' })
  id!: string;

  @Column({ type: 'text', nullable: true })
  printerName?: string | null;

  @Column({ type: 'text', default: 'escpos' })
  printMode!: 'escpos' | 'text' | 'html';

  @Column({ type: 'integer', default: 0 })
  printSilent!: number;

  @Column({ type: 'text', default: 'epson' })
  printerType!: string;

  @Column({ type: 'integer', default: 1 })
  fallbackHtml!: number;

  @UpdateDateColumn({ type: 'text' })
  updatedAt!: string;
}
