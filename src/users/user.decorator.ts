import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User, AuthenticatedUser } from './user.decorator';

@Controller('users')
export class UsersController {
  // Endpoint protegido: GET /users/me
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@User() user: AuthenticatedUser) {
    // Retornamos solo propiedades seguras de user
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
