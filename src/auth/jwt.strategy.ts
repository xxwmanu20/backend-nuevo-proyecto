import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtKeyService } from './jwt-key.service';
import { JwtTokenPayload } from './interfaces/jwt-token-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly jwtKeyService: JwtKeyService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtKeyService.getPublicKey(),
      algorithms: ['RS256'],
    });
  }

  validate(payload: JwtTokenPayload): { userId: number; email: string; role: string } {
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
  }
}
