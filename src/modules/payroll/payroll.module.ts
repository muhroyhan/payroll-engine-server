import { Module } from '@nestjs/common'
import { PayrollService } from './services'
import { PayrollController } from './controllers'

@Module({
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}
