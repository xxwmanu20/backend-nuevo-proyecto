import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { AuthService } from './auth.service';
import { AuthResult } from './interfaces/auth-result.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() payload: LoginDto): Promise<AuthResult> {
    return this.authService.login(payload.email, payload.password);
  }

  @Post('register')
  async register(@Body() payload: RegisterDto): Promise<AuthResult> {
    return this.authService.register(payload.email, payload.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() payload: RefreshTokenDto): Promise<AuthResult> {
    return this.authService.refresh(payload.refreshToken);
  }

  @Post('password/forgot')
  async requestPasswordReset(@Body() payload: PasswordResetRequestDto) {
    return this.authService.requestPasswordReset(payload.email);
  }

  @Post('password/reset')
  async resetPassword(@Body() payload: PasswordResetConfirmDto): Promise<AuthResult> {
    return this.authService.resetPassword(payload.token, payload.password);
  }
}
