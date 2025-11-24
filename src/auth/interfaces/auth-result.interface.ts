import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}
