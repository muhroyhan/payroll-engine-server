import { Module } from '@nestjs/common'
import { PrismaModule } from '@src/database/prisma.module'
import { AbilityFactory } from '@src/common/casl'
import { SalaryComponentController } from './controllers'
import { SalaryComponentService } from './services'

@Module({
  imports: [PrismaModule],
  controllers: [SalaryComponentController],
  providers: [SalaryComponentService, AbilityFactory],
  exports: [SalaryComponentService],
})
export class SalaryComponentModule {}
