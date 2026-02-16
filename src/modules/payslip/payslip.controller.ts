import { Controller } from '@nestjs/common';
import { PayslipService } from './payslip.service';

@Controller('payslip')
export class PayslipController {
  constructor(private readonly payslipService: PayslipService) {}
}
