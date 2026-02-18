import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { UsersModule } from '@src/modules/users/users.module'
import { AuthModule } from './modules/auth/auth.module'
import { TenantModule } from './modules/tenant/tenant.module'
import { EmployeeModule } from './modules/employee/employee.module'
import { SalaryComponentModule } from './modules/salary-component/salary-component.module'
import { PayrollModule } from './modules/payroll/payroll.module'
import { PayslipModule } from './modules/payslip/payslip.module'
import { AuditModule } from './modules/audit/audit.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        () => ({
          env: process.env.NODE_ENV,
          jwtsecret: process.env.JWT_SECRET,
        }),
      ],
    }),
    UsersModule,
    AuthModule,
    TenantModule,
    EmployeeModule,
    SalaryComponentModule,
    PayrollModule,
    PayslipModule,
    AuditModule,
  ],
  providers: [],
})
export class AppModule {}
