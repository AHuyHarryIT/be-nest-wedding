import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { DatabaseService } from '../database/database.service';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

describe('ServicesController', () => {
  let controller: ServicesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicesController],
      providers: [
        { provide: ServicesService, useValue: {} },
        { provide: JwtAuthGuard, useValue: { canActivate: () => true } },
        { provide: PermissionsGuard, useValue: { canActivate: () => true } },
        {
          provide: Reflector,
          useValue: { getAllAndOverride: () => undefined },
        },
        {
          provide: DatabaseService,
          useValue: { userRole: { findMany: jest.fn() } },
        },
      ],
    }).compile();

    controller = module.get<ServicesController>(ServicesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
