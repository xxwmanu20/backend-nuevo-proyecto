import { Injectable } from '@nestjs/common';
import {
  Prisma,
  Professional,
  Service as ServiceModel,
  ServiceCategory,
  ServiceOffering,
  User,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceListItem } from './dto/service.response';

type ServiceWithRelations = ServiceModel & {
  category: ServiceCategory;
  offerings: Array<
    ServiceOffering & {
      professional: Professional & {
        user: User;
      };
    }
  >;
};

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<ServiceListItem[]> {
    const services = await this.prisma.service.findMany({
      include: {
        category: true,
        offerings: {
          where: { isActive: true },
          orderBy: { price: Prisma.SortOrder.asc },
          include: {
            professional: {
              include: { user: true },
            },
          },
        },
      },
      orderBy: { name: Prisma.SortOrder.asc },
    });

    return services.map((service) => this.mapService(service));
  }

  private mapService(service: ServiceWithRelations): ServiceListItem {
    return {
      id: service.id,
      name: service.name,
      description: service.description ?? undefined,
      basePrice: service.basePrice.toNumber(),
      category: {
        id: service.category.id,
        name: service.category.name,
      },
      offerings: service.offerings.map((offering) => ({
        id: offering.id,
        price: offering.price.toNumber(),
        isActive: offering.isActive,
        professional: {
          id: offering.professional.id,
          email: offering.professional.user.email,
          bio: offering.professional.bio ?? undefined,
          hourlyRate: this.decimalToNumber(offering.professional.hourlyRate),
          rating: this.decimalToNumber(offering.professional.rating),
        },
      })),
    };
  }

  private decimalToNumber(value?: Prisma.Decimal | null): number | undefined {
    return value ? value.toNumber() : undefined;
  }
}
