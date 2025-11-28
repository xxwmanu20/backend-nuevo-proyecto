import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Ajustá la ruta si tu guard está en otro lado

@Controller('users')
export class UsersController {
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req) {
    return {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
    };
  }
}
