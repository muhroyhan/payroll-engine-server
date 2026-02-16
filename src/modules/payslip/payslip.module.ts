import { Module } from '@nestjs/common';
import { PayslipService } from './payslip.service';
import { PayslipController } from './payslip.controller';

@Module({
  controllers: [PayslipController],
  providers: [PayslipService],
})
export class PayslipModule {}
