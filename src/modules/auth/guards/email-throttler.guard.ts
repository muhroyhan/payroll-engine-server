import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Custom Email-Based Rate Limiter Guard for Fastify
 * Tracks FAILED login attempts by email address (not IP)
 * 5 failed attempts per 15 minutes per email
 *
 * Note: This guard only checks the limit but doesn't record attempts here.
 * Failed attempts are recorded when validateUser() throws an exception.
 * Successful attempts are cleared to prevent blocking after a successful login.
 */
@Injectable()
export class EmailThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(EmailThrottlerGuard.name)
  private readonly failedAttempts = new Map<string, number[]>()
  private readonly LIMIT = 5
  private readonly WINDOW_MS = 15 * 60 * 1000 // 15 minutes

  canActivate(ctx: ExecutionContext): boolean {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>()
    const reply = ctx.switchToHttp().getResponse<FastifyReply>()

    // Only throttle POST requests with email in body
    if (request.method !== 'POST' || !request.body) {
      return true
    }

    const body = request.body as Record<string, unknown>
    const email = body?.email

    if (typeof email !== 'string' || !email) {
      return true
    }

    const now = Date.now()
    const key = this.getKey(email)

    // Get failed attempt history for this email
    let failedAttempts = this.failedAttempts.get(key) || []

    // Remove old attempts outside the window
    failedAttempts = failedAttempts.filter(
      (timestamp) => now - timestamp < this.WINDOW_MS,
    )

    // Check if limit exceeded (only failed attempts count)
    if (failedAttempts.length >= this.LIMIT) {
      this.logger.warn(
        `Rate limit exceeded for email: ${email}. Failed attempts: ${failedAttempts.length}`,
      )

      // Set Retry-After header (seconds)
      const oldestAttempt = failedAttempts[0]
      const retryAfter = Math.ceil(
        (this.WINDOW_MS - (now - oldestAttempt)) / 1000,
      )
      reply.header('Retry-After', retryAfter.toString())

      throw new HttpException(
        {
          code: 'TOO_MANY_REQUESTS',
          message: `Too many failed login attempts. Please try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    return true
  }

  /**
   * Record a failed login attempt for the given email
   * Called by auth service when login fails
   */
  recordFailedAttempt(email: string): void {
    const key = this.getKey(email)
    const now = Date.now()
    const attempts = this.failedAttempts.get(key) || []

    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(
      (timestamp) => now - timestamp < this.WINDOW_MS,
    )

    recentAttempts.push(now)
    this.failedAttempts.set(key, recentAttempts)

    this.logger.debug(
      `Failed login recorded for ${email}. Total failed: ${recentAttempts.length}/${this.LIMIT}`,
    )
  }

  /**
   * Clear failed attempts for a successful login
   * Called by auth service when login succeeds
   */
  clearAttempts(email: string): void {
    const key = this.getKey(email)
    this.failedAttempts.delete(key)
    this.logger.debug(`Cleared failed attempts for ${email} (successful login)`)
  }

  /**
   * Get the cache key for an email
   */
  private getKey(email: string): string {
    return `login:${email.toLowerCase()}`
  }
}
