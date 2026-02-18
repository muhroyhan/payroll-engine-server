import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common'

import { AuthService } from '../services/auth.service'
import { EmailThrottlerGuard } from '../guards/email-throttler.guard'
import { RefreshDto } from '../dto/refresh.dto'
import { LoginResponse } from '../types/login-response.type'
import { LoginDto } from '../dto/login.dto'
import { CurrentUser } from '@src/common/decorators/current-user.decorator'
import type { AuthUser } from '@src/common/types/auth-user.type'
import { Public } from '@src/common/decorators/public.decorator'

/**
 * Authentication Controller
 *
 * Public Endpoints:
 * - POST /auth/login - Authenticate user with email/password
 * - POST /auth/refresh - Refresh access token using refresh token
 *
 * Protected Endpoints (require JWT):
 * - GET /auth/me - Get current user profile
 * - POST /auth/logout - Invalidate refresh token
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name)

  constructor(private auth: AuthService) {}

  /**
   * Login endpoint
   *
   * @param body - LoginDto with email and password
   * @returns LoginResponse with accessToken, refreshToken, and user data
   *
   * Rate Limiting: Max 5 attempts per 15 minutes per email address
   * Response: 200 on success, 401 on invalid credentials, 429 on rate limit
   */
  @UseGuards(EmailThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('login')
  async login(@Body() body: LoginDto): Promise<LoginResponse> {
    const user = await this.auth.validateUser(body.email, body.password)
    return this.auth.login(user)
  }

  /**
   * Refresh token endpoint
   *
   * @param body - RefreshDto with refresh token
   * @returns LoginResponse with new tokens
   *
   * Response: 200 on success, 401 if token is invalid or user inactive
   */
  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('refresh')
  async refresh(@Body() body: RefreshDto): Promise<LoginResponse> {
    return this.auth.refresh(body.refreshToken)
  }

  /**
   * Get current user profile
   *
   * @returns SafeUser object with current user information
   *
   * Requires: Valid JWT access token
   * Response: 200 with user data, 401 if token invalid or user inactive
   */
  @Get('me')
  async getCurrentUser(@CurrentUser() user: AuthUser) {
    return this.auth.getCurrentUser(user.userId)
  }

  /**
   * Logout endpoint
   * Invalidates refresh token, preventing further token refresh
   *
   * @returns Success response
   *
   * Requires: Valid JWT access token
   * Note: Existing access token remains valid until 15-minute expiration
   * For immediate token revocation, implement token blacklist
   * Response: 200 on success, 401 if token invalid
   */
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@CurrentUser() user: AuthUser): Promise<{ success: true }> {
    return this.auth.logout(user.userId)
  }
}
