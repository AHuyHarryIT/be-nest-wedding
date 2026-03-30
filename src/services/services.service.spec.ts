import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { CloudinaryService } from '../common/services/cloudinary.service';
import { ServicesService } from './services.service';

describe('ServicesService', () => {
  let service: ServicesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: DatabaseService, useValue: {} },
        { provide: CloudinaryService, useValue: {} },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
