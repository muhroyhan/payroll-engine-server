import { Module, ValidationPipe } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core'
import { AuthModule } from './modules/auth/auth.module'
import { AUTH_CONFIG } from './modules/auth/auth.config'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'
import { ThrottlerGuard } from '@nestjs/throttler'
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard'

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
      {
        name: 'login',
        ttl: AUTH_CONFIG.THROTTLE.LOGIN_TTL,
        limit: AUTH_CONFIG.THROTTLE.LOGIN_LIMIT,
      },
    ]),
    AuthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          transform: true,
          transformOptions: {
            enableImplicitConversion: true,
          },
          whitelist: true,
        }),
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
