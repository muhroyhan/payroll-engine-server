import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core'
import { AuthModule } from './modules/auth/auth.module'
import { AUTH_CONFIG } from './modules/auth/auth.config'
import { TenantModule } from './modules/tenant'
import { UserModule } from './modules/user'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'
import { ThrottlerGuard } from '@nestjs/throttler'
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard'
import { ValidationPipe } from './common/pipes/validation.pipe'
import { RolesGuard } from './common/guards/roles.guard'
import { AbilityFactory } from './common/casl'

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
        ttl: AUTH_CONFIG.THROTTLE.GLOBAL_TTL,
        limit: AUTH_CONFIG.THROTTLE.GLOBAL_LIMIT,
      },
    ]),
    AuthModule,
    TenantModule,
    UserModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    AbilityFactory,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
