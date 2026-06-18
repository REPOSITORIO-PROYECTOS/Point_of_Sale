import type { UserRole } from './user.entity';

export type AuthUser = {
  id: string;
  username: string;
  role: UserRole;
};

export type JwtPayload = {
  sub: string;
  username: string;
  role: UserRole;
};
