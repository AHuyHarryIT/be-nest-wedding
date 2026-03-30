import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { DatabaseService } from '../database/database.service';
import { PackagesController } from './packages.controller';
import { PackagesService } from './packages.service';

describe('PackagesController', () => {
  let controller: PackagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PackagesController],
      providers: [
        { provide: PackagesService, useValue: {} },
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

    controller = module.get<PackagesController>(PackagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
