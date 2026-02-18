import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { UsersModule } from '@src/modules/users/users.module'
import { AuthModule } from './modules/auth/auth.module'
import { TenantModule } from './modules/tenant/tenant.module'
import { EmployeeModule } from './modules/employee/employee.module'
import { SalaryComponentModule } from './modules/salary-component/salary-component.module'
import { PayrollModule } from './modules/payroll/payroll.module'
import { PayslipModule } from './modules/payslip/payslip.module'
import { AuditModule } from './modules/audit/audit.module'
import { AUTH_CONFIG } from './modules/auth/auth.config'

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
    /**
     * Throttler Configuration
     * - Global: 100 requests per 60 seconds
     * - Custom key generators per endpoint (see auth controller for email-based limiting)
     */
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60,
        limit: 100,
      },
      {
        name: 'login',
        ttl: AUTH_CONFIG.THROTTLE.LOGIN_TTL,
        limit: AUTH_CONFIG.THROTTLE.LOGIN_LIMIT,
      },
    ]),
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
