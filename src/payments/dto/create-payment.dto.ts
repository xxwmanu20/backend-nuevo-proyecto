import { PaymentStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Min,
  IsNumber,
} from 'class-validator';

const parseDecimal = (value: unknown): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'number') {
    return Number.isNaN(value) ? undefined : value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    const parsed = Number.parseFloat(trimmed);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
};

const normalizeCurrency = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toUpperCase() : undefined;
};

const normalizeProvider = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toUpperCase() : undefined;
};

export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  bookingId!: number;

  @Transform(({ value }) => parseDecimal(value))
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @Transform(({ value }) => normalizeCurrency(value))
  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsEnum(PaymentStatus)
  status!: PaymentStatus;

  @Transform(({ value }) => normalizeProvider(value))
  @IsString()
  @IsNotEmpty()
  provider!: string;

  @IsOptional()
  @IsString()
  providerPaymentId?: string;

  @IsOptional()
  @IsString()
  clientSecret?: string;
}
