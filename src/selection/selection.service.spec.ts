import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { SelectionService } from './selection.service';

describe('SelectionService', () => {
  let service: SelectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SelectionService, { provide: DatabaseService, useValue: {} }],
    }).compile();

    service = module.get<SelectionService>(SelectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
