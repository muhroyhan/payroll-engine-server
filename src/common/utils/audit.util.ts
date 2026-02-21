import { Request } from 'express'
import { AuditContext } from '../types/audit.type'

/**
 * Get audit context from request
 * Extracts user and tenant information from JWT token
 *
 * @param request - Express request object
 * @returns Audit context with user and tenant info
 * @throws UnauthorizedException if user not found in request
 */
export function getAuditContext(request: Request): AuditContext {
  const user = request.user as any

  if (!user || !user.sub || !user.tenantId) {
    throw new Error('User context not found in request')
  }

  return {
    userId: user.sub, // JWT subject is user ID
    tenantId: user.tenantId, // Tenant ID from JWT claims
    action: 'READ', // Default action, can be overridden
    timestamp: new Date(),
  }
}

/**
 * Build audit context with custom action
 *
 * @param request - Express request object
 * @param action - Audit action type
 * @param metadata - Additional metadata
 * @returns Complete audit context
 */
export function buildAuditContext(
  request: Request,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ',
  metadata?: Record<string, any>,
): AuditContext {
  const baseContext = getAuditContext(request)
  return {
    ...baseContext,
    action,
    metadata,
  }
}

/**
 * Ensure request has valid user context
 * Use in controllers before calling services
 *
 * @param request - Express request object
 * @returns User and tenant IDs
 * @throws Error if user or tenant not found
 */
export function ensureUserContext(request: Request): {
  userId: string
  tenantId: string
} {
  const user = request.user as any

  if (!user || !user.sub) {
    throw new Error('User not authenticated')
  }

  if (!user.tenantId) {
    throw new Error('Tenant context missing')
  }

  return {
    userId: user.sub,
    tenantId: user.tenantId,
  }
}
