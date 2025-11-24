import { UnauthorizedException } from '@nestjs/common';
import { JwtKeyService } from './jwt-key.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('returns user context during validation', () => {
    const keyServiceMock = {
      getPublicKey: jest.fn(() => 'public-key'),
    } satisfies Pick<JwtKeyService, 'getPublicKey'>;

    const strategy = new JwtStrategy(keyServiceMock as unknown as JwtKeyService);

    const result = strategy.validate({
      sub: '42',
      userId: 42,
      email: 'user@example.com',
      role: 'CUSTOMER',
      tokenType: 'access',
    });

    expect(result).toEqual({ userId: 42, email: 'user@example.com', role: 'CUSTOMER' });
    expect(keyServiceMock.getPublicKey).toHaveBeenCalledTimes(1);
  });

  it('rejects tokens that are not access tokens', () => {
    const keyServiceMock = {
      getPublicKey: jest.fn(() => 'public-key'),
    } satisfies Pick<JwtKeyService, 'getPublicKey'>;

    const strategy = new JwtStrategy(keyServiceMock as unknown as JwtKeyService);

    expect(() =>
      strategy.validate({
        sub: '1',
        userId: 1,
        email: 'user@example.com',
        role: 'CUSTOMER',
        tokenType: 'refresh',
      }),
    ).toThrow(UnauthorizedException);
  });
});
