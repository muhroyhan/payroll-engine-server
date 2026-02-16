import { Test, TestingModule } from '@nestjs/testing';
import { SalaryComponentController } from './salary-component.controller';
import { SalaryComponentService } from './salary-component.service';

describe('SalaryComponentController', () => {
  let controller: SalaryComponentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalaryComponentController],
      providers: [SalaryComponentService],
    }).compile();

    controller = module.get<SalaryComponentController>(SalaryComponentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
