export interface BookingServiceInfo {
  id: number;
  name: string;
  description?: string;
}

export interface BookingResponse {
  id: number;
  status: string;
  scheduledAt: Date;
  service: BookingServiceInfo;
}

export type BookingListItem = BookingResponse;
