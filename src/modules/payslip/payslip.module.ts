import { Module } from '@nestjs/common'
import { PayslipService } from './services'
import { PayslipController } from './controllers'

@Module({
  controllers: [PayslipController],
  providers: [PayslipService],
})
export class PayslipModule {}
