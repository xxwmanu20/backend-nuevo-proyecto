import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User, AuthenticatedUser } from './user.decorator';

@Controller('users')
export class UsersController {
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@User() user: AuthenticatedUser) {
    return user; // Ya está tipado, ESLint no marca errors
  }
}
