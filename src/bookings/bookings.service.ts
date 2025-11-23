import { Injectable, NotFoundException } from '@nestjs/common';
import { Booking as BookingModel, Prisma, Service as ServiceModel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingListItem, BookingResponse } from './dto/booking.response';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateBookingDto): Promise<BookingResponse> {
    const booking = await this.prisma.booking.create({
      data: {
        customerId: payload.customerId,
        professionalId: payload.professionalId,
        serviceId: payload.serviceId,
        scheduledAt: payload.scheduledAt,
        notes: payload.notes ?? null,
      },
      include: {
        service: true,
      },
    });

    return this.mapBooking(booking);
  }

  async list(pagination: PaginationDto): Promise<BookingListItem[]> {
    const take = pagination.limit ?? 25;
    const skip = pagination.offset ?? 0;

    const bookings = await this.prisma.booking.findMany({
      skip,
      take,
      include: {
        service: true,
      },
      orderBy: { createdAt: Prisma.SortOrder.desc },
    });

    return bookings.map((booking) => this.mapBooking(booking));
  }

  async detail(id: number): Promise<BookingResponse> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        service: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return this.mapBooking(booking);
  }

  private mapBooking(booking: BookingModel & { service: ServiceModel }): BookingResponse {
    return {
      id: booking.id,
      status: booking.status,
      scheduledAt: booking.scheduledAt,
      service: {
        id: booking.service.id,
        name: booking.service.name,
        description: booking.service.description ?? undefined,
      },
    };
  }
}
