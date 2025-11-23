export interface JwtTokenPayload {
  sub: string;
  userId: number;
  email: string;
  role: string;
}
