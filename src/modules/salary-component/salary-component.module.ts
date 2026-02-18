import { Module } from '@nestjs/common'
import { SalaryComponentService } from './services'
import { SalaryComponentController } from './controllers'

@Module({
  controllers: [SalaryComponentController],
  providers: [SalaryComponentService],
})
export class SalaryComponentModule {}
