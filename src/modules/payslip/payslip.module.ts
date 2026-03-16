import { Module } from '@nestjs/common'
import { PrismaModule } from '@src/database/prisma.module'
import { AbilityFactory } from '@src/common/casl'
import { PayslipController } from './controllers'
import { PayslipService } from './services'

@Module({
  imports: [PrismaModule],
  controllers: [PayslipController],
  providers: [PayslipService, AbilityFactory],
  exports: [PayslipService],
})
export class PayslipModule {}
