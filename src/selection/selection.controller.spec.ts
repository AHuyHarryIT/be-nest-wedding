import { Test, TestingModule } from '@nestjs/testing';
import { SelectionService } from './selection.service';
import { SelectionController } from './selection.controller';

describe('SelectionController', () => {
  let controller: SelectionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SelectionController],
      providers: [{ provide: SelectionService, useValue: {} }],
    }).compile();

    controller = module.get<SelectionController>(SelectionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
