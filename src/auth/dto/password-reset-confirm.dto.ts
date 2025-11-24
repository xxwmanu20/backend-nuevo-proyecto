import { IsString, MinLength } from 'class-validator';

export class PasswordResetConfirmDto {
  @IsString()
  @MinLength(16)
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
