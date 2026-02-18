import { Controller } from '@nestjs/common'
import { PayslipService } from '../services/payslip.service'

@Controller('payslip')
export class PayslipController {
  constructor(private readonly payslipService: PayslipService) {}
}
