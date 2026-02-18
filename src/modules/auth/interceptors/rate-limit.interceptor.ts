import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common'
import { Request } from 'express'
import { Observable } from 'rxjs'
import { AUTH_CONFIG } from '../auth.config'

interface AttemptRecord {
  count: number
  firstAttemptTime: number
  lastAttemptTime: number
}

interface LoginRequest extends Request {
  body: {
    email?: string
    password?: string
  }
}

/**
 * Rate Limiting Interceptor
 * Prevents brute force attacks by limiting login attempts per email
 * Strategy: 5 attempts per 15 minutes per email
 *
 * Note: In-memory storage suitable for single server.
 * For distributed systems, use Redis or database-backed rate limiting.
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly loginAttempts: Map<string, AttemptRecord> = new Map()
  private readonly logger = new Logger(RateLimitInterceptor.name)
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Start cleanup interval to prevent memory leaks
    this.startCleanupInterval()
  }

  private startCleanupInterval(): void {
    if (this.cleanupInterval) return

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRecords()
    }, AUTH_CONFIG.RATE_LIMIT.CLEANUP_INTERVAL_MS)

    this.cleanupInterval.unref() // Don't prevent process exit
  }

  /**
   * Remove expired rate limit records from memory
   * Called periodically to prevent unbounded memory growth
   */
  private cleanupExpiredRecords(): void {
    const now = Date.now()
    let cleanedCount = 0

    for (const [email, record] of this.loginAttempts.entries()) {
      if (now - record.lastAttemptTime > AUTH_CONFIG.RATE_LIMIT.WINDOW_MS) {
        this.loginAttempts.delete(email)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired rate limit records`)
    }
  }

  /**
   * Calculate remaining time in rate limit window
   */
  private getRemainingTime(record: AttemptRecord): number {
    const elapsedMs = Date.now() - record.firstAttemptTime
    const remainingMs = AUTH_CONFIG.RATE_LIMIT.WINDOW_MS - elapsedMs
    return Math.ceil(remainingMs / 1000) // Convert to seconds
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<LoginRequest>()
    const email = request.body?.email?.toLowerCase().trim()

    // Skip rate limiting if no email provided
    if (!email || typeof email !== 'string') {
      return next.handle()
    }

    const now = Date.now()
    let record = this.loginAttempts.get(email)

    // Reset record if outside the time window
    if (
      record &&
      now - record.firstAttemptTime > AUTH_CONFIG.RATE_LIMIT.WINDOW_MS
    ) {
      this.loginAttempts.delete(email)
      record = undefined
    }

    // Initialize or update record
    if (!record) {
      record = {
        count: 0,
        firstAttemptTime: now,
        lastAttemptTime: now,
      }
    }

    // Check if limit exceeded
    if (record.count >= AUTH_CONFIG.RATE_LIMIT.LOGIN_MAX_ATTEMPTS) {
      const remainingSeconds = this.getRemainingTime(record)
      this.logger.warn(
        `Rate limit exceeded for email: ${email}. Attempts: ${record.count}/${AUTH_CONFIG.RATE_LIMIT.LOGIN_MAX_ATTEMPTS}`,
      )

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: AUTH_CONFIG.ERROR_CODE.RATE_LIMITED,
          message: AUTH_CONFIG.ERROR.RATE_LIMITED,
          retryAfter: remainingSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    // Increment attempt counter
    record.count++
    record.lastAttemptTime = now
    this.loginAttempts.set(email, record)

    return next.handle()
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}
