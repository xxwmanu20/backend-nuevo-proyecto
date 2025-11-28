import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfig } from './config/app.config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { ServicesModule } from './services/services.module';
import { UsersModule } from './users/users.module'; // <-- importamos UsersModule
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [AppConfig],
    }),
    PrismaModule,
    AuthModule,
    BookingsModule,
    ServicesModule,
    PaymentsModule,
    UsersModule, // <-- agregamos aquí
  ],
  controllers: [AppController],
})
export class AppModule {}
