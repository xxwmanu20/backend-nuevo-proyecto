import { UserRole } from '../../common/enums';

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
