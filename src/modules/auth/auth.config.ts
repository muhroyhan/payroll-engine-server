/**
 * Authentication Security Configuration
 * Centralized constants for JWT, rate limiting, and token management
 */

export const AUTH_CONFIG = {
  // JWT Token Expiry Times
  TOKEN: {
    ACCESS_EXPIRY: '15m', // 15 minutes - short-lived for security (human-readable)
    REFRESH_EXPIRY: '7d', // 7 days (human-readable)
    ACCESS_EXPIRY_SECONDS: 15 * 60, // 15 minutes in seconds
    REFRESH_EXPIRY_SECONDS: 7 * 24 * 60 * 60, // 7 days in seconds
    ALGORITHM: 'HS256', // HMAC SHA-256
  },

  // Password Policy
  PASSWORD: {
    BCRYPT_SALT_ROUNDS: 12, // Higher rounds for better security
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: true,
  },

  // Throttling Configuration (@nestjs/throttler)
  THROTTLE: {
    GLOBAL_LIMIT: 100, // Global rate limit per minute
    GLOBAL_TTL: 60, // 1 minute in seconds
  },

  // Error Messages (Generic for security - don't reveal user existence)
  ERROR: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    USER_INACTIVE: 'Account is inactive. Please contact support.',
    INVALID_TOKEN: 'Invalid or expired token',
    INVALID_REFRESH_TOKEN: 'Refresh token is invalid or expired',
    RATE_LIMITED: 'Too many login attempts. Please try again in 15 minutes.',
    TOKEN_REVOKED: 'Token has been revoked. Please login again.',
  },

  // Error Codes for Frontend
  ERROR_CODE: {
    INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
    USER_INACTIVE: 'AUTH_USER_INACTIVE',
    INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
    RATE_LIMITED: 'AUTH_RATE_LIMITED',
    TOKEN_REVOKED: 'AUTH_TOKEN_REVOKED',
  },
}
