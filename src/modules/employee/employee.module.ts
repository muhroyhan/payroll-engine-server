import { Module } from '@nestjs/common'
import { PrismaModule } from '@src/database/prisma.module'
import { AbilityFactory } from '@src/common/casl'
import { EmployeeController } from './controllers'
import { EmployeeService } from './services'

@Module({
  imports: [PrismaModule],
  controllers: [EmployeeController],
  providers: [EmployeeService, AbilityFactory],
  exports: [EmployeeService],
})
export class EmployeeModule {}
