import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { DatabaseService } from '../database/database.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

describe('RolesController', () => {
  let controller: RolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        { provide: RolesService, useValue: {} },
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

    controller = module.get<RolesController>(RolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
