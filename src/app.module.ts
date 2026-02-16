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
import { PrismaService } from './database/prisma.service'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        () => ({
          db: {
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || ''),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
          },
          env: process.env.NODE_ENV,
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
