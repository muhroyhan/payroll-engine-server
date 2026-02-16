import { Test, TestingModule } from '@nestjs/testing';
import { SalaryComponentService } from './salary-component.service';

describe('SalaryComponentService', () => {
  let service: SalaryComponentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SalaryComponentService],
    }).compile();

    service = module.get<SalaryComponentService>(SalaryComponentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
