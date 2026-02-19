import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'

import { AuthController } from './controllers'
import { AuthService } from './services'
import { JwtStrategy } from './strategies/jwt.strategy'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { PrismaModule } from '@src/database/prisma.module'
import { AUTH_CONFIG } from './auth.config'
import { EmailThrottlerGuard } from './guards/email-throttler.guard'

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('jwtsecret')
        if (!secret) {
          throw new Error('JWT_SECRET is required')
        }
        return {
          secret,
          signOptions: { expiresIn: AUTH_CONFIG.TOKEN.ACCESS_EXPIRY_SECONDS },
        }
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, EmailThrottlerGuard],
  exports: [AuthService, EmailThrottlerGuard],
})
export class AuthModule {}
