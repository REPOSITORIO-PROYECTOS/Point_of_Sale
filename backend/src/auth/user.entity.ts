import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

export const USER_ROLES = ['admin', 'cashier'] as const;
export type UserRole = (typeof USER_ROLES)[number];

@Entity('users')
export class UserEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', unique: true })
  username!: string;

  @Column({ type: 'text' })
  passwordHash!: string;

  @Column({ type: 'text', default: 'cashier' })
  role!: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
