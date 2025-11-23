import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingsService } from './bookings.service';
import { BookingListItem, BookingResponse } from './dto/booking.response';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  async create(@Body() payload: CreateBookingDto): Promise<BookingResponse> {
    return this.bookingsService.create(payload);
  }

  @Get()
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  async list(@Query() pagination: PaginationDto): Promise<BookingListItem[]> {
    return this.bookingsService.list(pagination);
  }

  @Get(':id')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  async detail(@Param('id', ParseIntPipe) id: number): Promise<BookingResponse> {
    return this.bookingsService.detail(id);
  }
}
