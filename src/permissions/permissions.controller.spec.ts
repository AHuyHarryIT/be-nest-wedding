import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { DatabaseService } from '../database/database.service';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

describe('PermissionsController', () => {
  let controller: PermissionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionsController],
      providers: [
        { provide: PermissionsService, useValue: {} },
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

    controller = module.get<PermissionsController>(PermissionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
