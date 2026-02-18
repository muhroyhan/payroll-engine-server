import { SetMetadata } from '@nestjs/common'

/**
 * Custom throttler metadata for email-based rate limiting
 * Used by ThrottlerGuard to extract email from request body
 */
export const THROTTLE_BY_EMAIL = 'throttle_by_email'

export const ThrottleByEmail = () => SetMetadata(THROTTLE_BY_EMAIL, true)
