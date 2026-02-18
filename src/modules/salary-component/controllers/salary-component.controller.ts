import { Controller } from '@nestjs/common'
import { SalaryComponentService } from '../services/salary-component.service'

@Controller('salary-component')
export class SalaryComponentController {
  constructor(
    private readonly salaryComponentService: SalaryComponentService,
  ) {}
}
