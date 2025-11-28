import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthenticatedUser {
  id: number;
  email: string;
  role: string;
}

@Controller('users')
export class UsersController {
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req: { user: AuthenticatedUser }) {
    // Devuelve directamente el usuario tipado
    return req.user;
  }
}
