import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'

import { JwtPayload } from '../types/jwt-payload.type'
import { LoginResponse, SafeUser } from '../types/login-response.type'
import { PrismaService } from '@src/database/prisma.service'
import { User } from '@prismaclient/client'
import { AUTH_CONFIG } from '../auth.config'
import { EmailThrottlerGuard } from '../guards/email-throttler.guard'

/**
 * Authentication Service
 * Handles user login, logout, token refresh, and validation
 *
 * Security Considerations:
 * - Uses bcrypt with configurable salt rounds for password hashing
 * - Validates JWT tokens with expiration checks
 * - Stores refresh tokens as hashes (not plain text)
 * - Validates user active status on every operation
 * - Generic error messages prevent user enumeration attacks
 * - Tracks failed login attempts for rate limiting
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private throttler: EmailThrottlerGuard,
  ) {}

  /**
   * Build JWT payload from user data
   * Only includes essential claims to keep token size small
   */
  private buildPayload(user: User): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    }
  }

  /**
   * Convert user to safe format (exclude sensitive fields)
   * Safe to send to client
   */
  private toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tenantId: user.tenantId,
    }
  }

  /**
   * Generate both access and refresh tokens
   * Access token: Short-lived (15m) for security
   * Refresh token: Longer-lived (7d) for convenience
   */
  private async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = this.buildPayload(user)

    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.jwt.signAsync(payload as Record<string, unknown>, {
          expiresIn: AUTH_CONFIG.TOKEN.ACCESS_EXPIRY_SECONDS,
        }),
        this.jwt.signAsync(payload as Record<string, unknown>, {
          expiresIn: AUTH_CONFIG.TOKEN.REFRESH_EXPIRY_SECONDS,
        }),
      ])

      return { accessToken, refreshToken }
    } catch (err) {
      this.logger.error('Failed to generate tokens:', err)
      throw new InternalServerErrorException(
        'Failed to generate authentication tokens',
      )
    }
  }

  /**
   * Store hashed refresh token in database
   * Prevents token compromise if database is breached
   * The actual token is only sent to client once
   */
  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    try {
      const hash = await bcrypt.hash(
        refreshToken,
        AUTH_CONFIG.PASSWORD.BCRYPT_SALT_ROUNDS,
      )

      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: hash },
      })
    } catch (error) {
      this.logger.error(
        `Failed to store refresh token for user ${userId}:`,
        error,
      )
      throw new InternalServerErrorException('Failed to store session token')
    }
  }

  /**
   * Validate user credentials
   * - Check if user exists and is active
   * - Verify password using bcrypt
   * - Generic error message prevents user enumeration
   * - Only records failed attempts for existing users with wrong password
   * - Does NOT record attempts for unregistered emails
   *
   * @throws UnauthorizedException with generic message
   */
  async validateUser(email: string, password: string): Promise<User> {
    // Normalize email for consistency
    const normalizedEmail = email.toLowerCase().trim()

    // Find active user by email
    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, isActive: true },
    })

    // Email not registered - no attempt recorded
    if (!user) {
      this.logger.warn(
        `Login attempt with unregistered email: ${normalizedEmail}`,
      )
      throw new UnauthorizedException(AUTH_CONFIG.ERROR.INVALID_CREDENTIALS)
    }

    // Verify password using bcrypt constant-time comparison
    const passwordValid = await bcrypt.compare(password, user.password)

    if (!passwordValid) {
      this.logger.warn(`Failed login attempt for user: ${user.id}`)
      // Only record failed attempt when email exists but password is wrong
      this.throttler.recordFailedAttempt(normalizedEmail)
      throw new UnauthorizedException(AUTH_CONFIG.ERROR.INVALID_CREDENTIALS)
    }

    this.logger.log(`User logged in: ${user.id}`)
    return user
  }

  /**
   * Login user and generate tokens
   * - Generate access and refresh tokens
   * - Store hashed refresh token in database
   * - Clear failed login attempts for successful logins
   * - Return tokens and user data
   */
  async login(user: User): Promise<LoginResponse> {
    const tokens = await this.generateTokens(user)
    await this.storeRefreshToken(user.id, tokens.refreshToken)

    // Clear failed attempts on successful login
    this.throttler.clearAttempts(user.email)

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.toSafeUser(user),
    }
  }

  /**
   * Refresh access token using refresh token
   * - Validate JWT signature and expiration
   * - Verify user exists and is active
   * - Verify refresh token matches stored hash
   * - Issue new token pair
   *
   * Security: If refresh token is compromised, new password is required to regain access
   */
  async refresh(refreshToken: string): Promise<LoginResponse> {
    // Validate JWT signature and expiration
    let payload: JwtPayload
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken)
    } catch {
      this.logger.warn('Invalid refresh token provided')
      throw new UnauthorizedException(AUTH_CONFIG.ERROR.INVALID_REFRESH_TOKEN)
    }

    // Find user and verify they still exist and are active
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedException(AUTH_CONFIG.ERROR.USER_INACTIVE)
    }

    if (!user.refreshToken) {
      // No refresh token stored = logged out
      this.logger.warn(`Refresh token not found for user: ${user.id}`)
      throw new UnauthorizedException(AUTH_CONFIG.ERROR.INVALID_REFRESH_TOKEN)
    }

    // Verify provided token matches stored hash
    const tokenValid = await bcrypt.compare(refreshToken, user.refreshToken)

    if (!tokenValid) {
      this.logger.warn(`Invalid refresh token for user: ${user.id}`)
      throw new UnauthorizedException(AUTH_CONFIG.ERROR.INVALID_REFRESH_TOKEN)
    }

    // Issue new tokens
    const tokens = await this.generateTokens(user)
    await this.storeRefreshToken(user.id, tokens.refreshToken)

    this.logger.log(`Token refreshed for user: ${user.id}`)
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.toSafeUser(user),
    }
  }

  /**
   * Logout user
   * - Clear stored refresh token to invalidate session
   * - All existing tokens remain valid until expiration (especially access token at 15m)
   * Access tokens cannot be revoked without a blacklist (consider adding for longer expiry)
   */
  async logout(userId: string): Promise<{ success: true }> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      })

      this.logger.log(`User logged out: ${userId}`)
      return { success: true }
    } catch (err) {
      this.logger.error(`Failed to logout user ${userId}:`, err)
      throw new InternalServerErrorException('Failed to logout')
    }
  }

  /**
   * Get current user profile
   * Validates user exists and is active
   */
  async getCurrentUser(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedException(AUTH_CONFIG.ERROR.USER_INACTIVE)
    }

    return this.toSafeUser(user)
  }
}
