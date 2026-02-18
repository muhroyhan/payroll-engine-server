import { Controller } from '@nestjs/common'
import { PayrollService } from '../services/payroll.service'

@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}
}
