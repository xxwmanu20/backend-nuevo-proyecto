import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: string;
}

// Extendemos Request para tipar `user`
interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

export const User = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user) {
      throw new Error('User not found on request');
    }

    // Aquí hacemos casting explícito para que ESLint deje de quejarse
    return request.user as AuthenticatedUser;
  },
);
