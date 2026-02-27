import type { AuditContext, AuthenticatedRequest } from '../types/audit.type'

/**
 * Get audit context from request
 * Extracts user and tenant information from JWT token
 *
 * @param request - Fastify request object with authenticated user
 * @returns Audit context with user and tenant info
 * @throws Error if user not found in request
 */
export function getAuditContext(request: AuthenticatedRequest): AuditContext {
  const user = request.user

  if (!user || !user.userId || !user.fullName || !user.role) {
    throw new Error('User context not found in request')
  }

  if (user.role !== 'superadmin' && user.tenantId === null) {
    throw new Error('Tenant context missing for non-superadmin user')
  }

  return {
    userId: user.userId, // User ID from authenticated request
    userFullName: user.fullName, // User full name
    role: user.role,
    tenantId: user.tenantId, // Tenant ID from JWT claims
    action: 'READ', // Default action, can be overridden
    timestamp: new Date(),
  }
}

/**
 * Build audit context with custom action
 *
 * @param request - Fastify request object with authenticated user
 * @param action - Audit action type
 * @param metadata - Additional metadata
 * @returns Complete audit context
 */
export function buildAuditContext(
  request: AuthenticatedRequest,
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
 * @param request - Fastify request object with authenticated user
 * @returns User and tenant IDs
 * @throws Error if user or tenant not found
 */
export function ensureUserContext(request: AuthenticatedRequest): {
  userId: number
  role: NonNullable<AuthenticatedRequest['user']>['role']
  tenantId: number | null
} {
  const user = request.user

  if (!user || !user.userId || !user.role) {
    throw new Error('User not authenticated')
  }

  if (user.role !== 'superadmin' && user.tenantId === null) {
    throw new Error('Tenant context missing')
  }

  return {
    userId: user.userId,
    role: user.role,
    tenantId: user.tenantId,
  }
}
