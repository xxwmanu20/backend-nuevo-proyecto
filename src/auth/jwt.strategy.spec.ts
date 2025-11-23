import { JwtKeyService } from './jwt-key.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('returns user context during validation', async () => {
    const keyServiceMock = {
      getPublicKey: jest.fn(() => 'public-key'),
    } satisfies Pick<JwtKeyService, 'getPublicKey'>;

    const strategy = new JwtStrategy(keyServiceMock as unknown as JwtKeyService);

    const result = await strategy.validate({
      sub: '42',
      userId: 42,
      email: 'user@example.com',
      role: 'CUSTOMER',
    });

    expect(result).toEqual({ userId: 42, email: 'user@example.com', role: 'CUSTOMER' });
    expect(keyServiceMock.getPublicKey).toHaveBeenCalledTimes(1);
  });
});
