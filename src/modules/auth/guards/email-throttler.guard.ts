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
 * Tracks login attempts by email address (not IP)
 * 5 attempts per 15 minutes per email
 */
@Injectable()
export class EmailThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(EmailThrottlerGuard.name)
  private readonly attempts = new Map<string, number[]>()
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
    const key = `login:${email.toLowerCase()}`

    // Get attempt history for this email
    let emailAttempts = this.attempts.get(key) || []

    // Remove old attempts outside the window
    emailAttempts = emailAttempts.filter(
      (timestamp) => now - timestamp < this.WINDOW_MS,
    )

    // Check if limit exceeded
    if (emailAttempts.length >= this.LIMIT) {
      this.logger.warn(
        `Rate limit exceeded for email: ${email}. Attempts: ${emailAttempts.length}`,
      )

      // Set Retry-After header (seconds)
      const oldestAttempt = emailAttempts[0]
      const retryAfter = Math.ceil(
        (this.WINDOW_MS - (now - oldestAttempt)) / 1000,
      )
      reply.header('Retry-After', retryAfter.toString())

      throw new HttpException(
        {
          code: 'TOO_MANY_REQUESTS',
          message: `Too many login attempts. Please try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    // Record this attempt
    emailAttempts.push(now)
    this.attempts.set(key, emailAttempts)

    this.logger.debug(
      `Login attempt ${emailAttempts.length}/${this.LIMIT} for email: ${email}`,
    )

    return true
  }
}
