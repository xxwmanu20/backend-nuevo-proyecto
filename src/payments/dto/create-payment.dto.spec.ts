import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { PaymentStatus } from '@prisma/client';
import { CreatePaymentDto } from './create-payment.dto';

const buildDto = (override: Partial<CreatePaymentDto> = {}) =>
  plainToInstance(CreatePaymentDto, {
    bookingId: 1,
    amount: 100,
    currency: 'usd',
    status: PaymentStatus.SUCCEEDED,
    provider: 'stripe',
    ...override,
  });

const hasErrorFor = (errors: ValidationError[], property: string): boolean =>
  errors.some((error) =>
    error.property === property &&
    error.constraints !== undefined &&
    Object.keys(error.constraints).length > 0,
  );

describe('CreatePaymentDto validation', () => {
  it('rejects currency with fewer than three characters after normalization', async () => {
    const dto = buildDto({ currency: 'us' });
    const errors = await validate(dto);

    expect(hasErrorFor(errors, 'currency')).toBe(true);
  });

  it('rejects currency that normalizes to undefined (blank input)', async () => {
    const dto = buildDto({ currency: '   ' });
    const errors = await validate(dto);

    expect(hasErrorFor(errors, 'currency')).toBe(true);
  });

  it('rejects provider strings that are blank after trimming', async () => {
    const dto = buildDto({ provider: '   ' });
    const errors = await validate(dto);

    expect(hasErrorFor(errors, 'provider')).toBe(true);
  });
});
