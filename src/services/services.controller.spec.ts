import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

const mockServices = [
  {
    id: 1,
    name: 'Servicio A',
    description: 'Desc',
    basePrice: 100,
    category: { id: 2, name: 'Cat' },
    offerings: [],
  },
];

describe('ServicesController', () => {
  let controller: ServicesController;
  const listMock = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicesController],
      providers: [
        {
          provide: ServicesService,
          useValue: {
            list: listMock,
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ServicesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the list of services from ServicesService', async () => {
    listMock.mockResolvedValue(mockServices);

    const result = await controller.list();

    expect(listMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockServices);
  });

  it('propagates errors thrown by ServicesService', async () => {
    const error = new Error('Unexpected');
    listMock.mockRejectedValue(error);

    await expect(controller.list()).rejects.toBe(error);
  });
});