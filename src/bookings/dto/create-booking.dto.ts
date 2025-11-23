import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  @Min(1)
  customerId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  professionalId?: number;

  @IsInt()
  @Min(1)
  serviceId!: number;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
