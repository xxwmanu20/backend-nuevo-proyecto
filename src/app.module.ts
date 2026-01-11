import { Module, Controller, Get, Inject } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfig } from './config/app.config';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { ServicesModule } from './services/services.module';
import { UsersModule } from './users/users.module'; // <-- importamos UsersModule
import { AppController } from './app.controller';



@Controller()
export class RootController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  getRoot() {
    return { status: 'ok', message: 'API funcionando correctamente' };
  }

  @Get('db-check')
  async dbCheck() {
    try {
      // Consulta simple a la base de datos (puedes cambiar por una tabla real)
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', message: 'Conexión a la base de datos exitosa' };
    } catch (error) {
      return { status: 'error', message: 'Error de conexión a la base de datos', error: error?.message };
    }
  }
}

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
<<<<<<< HEAD
  controllers: [AppController],
=======
  controllers: [RootController],
>>>>>>> 0f275d1 (feat: mostrar resetToken en respuesta de /auth/password/forgot para pruebas)
})
export class AppModule {}
