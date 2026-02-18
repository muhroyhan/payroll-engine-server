import { ExecutionContext } from '@nestjs/common'
import { Request } from 'express'

/**
 * Email-based throttler key generator
 * Used with @Throttle() decorator for login endpoint
 * Rates limit by email address instead of IP to prevent brute force attacks
 */
export const emailThrottlerKey = (context: ExecutionContext): string => {
  const request = context.switchToHttp().getRequest<Request>()
  const email = (request.body as Record<string, unknown>)?.email

  // If no email in request, fall back to IP-based throttling
  if (typeof email !== 'string' || !email) {
    const ip = request.ip ?? request.socket?.remoteAddress ?? 'unknown'
    return ip
  }

  // Normalize and create email-based key
  return `login:${email.toLowerCase().trim()}`
}
