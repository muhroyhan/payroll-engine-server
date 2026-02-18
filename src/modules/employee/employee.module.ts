import { Module } from '@nestjs/common'
import { EmployeeController } from './controllers'
import { EmployeeService } from './services'

@Module({
  controllers: [EmployeeController],
  providers: [EmployeeService],
})
export class EmployeeModule {}
