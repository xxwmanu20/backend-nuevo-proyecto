import { PaymentStatus } from '../../common/enums';

export interface PaymentResponse {
  id: number;
  bookingId: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerPaymentId?: string;
  clientSecret?: string;
  createdAt: Date;
  updatedAt: Date;
}
