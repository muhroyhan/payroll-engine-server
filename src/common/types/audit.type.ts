import type { AuthUser } from './auth-user.type'

/**
 * Audit metadata interface
 * Used to track who created/updated records and when
 */
export interface AuditMetadata {
  createdBy: string // User ID who created the record
  createdAt: Date // When the record was created
  updatedBy?: string // User ID who last updated the record
  updatedAt?: Date // When the record was last updated
}

/**
 * Audit context passed through service operations
 */
export interface AuditContext {
  userId: number // Current user ID performing the action
  userFullName: string // Current user's full name
  role: AuthUser['role']
  tenantId: number | null // Tenant context (nullable for superadmin)
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ'
  timestamp: Date
  metadata?: Record<string, any>
}

/**
 * JWT payload added to request by Passport strategy
 */
export interface JwtPayload {
  sub: number // User ID
  tenantId: number | null // Tenant ID (nullable for superadmin)
  email?: string
  roles?: string[]
}

/**
 * Fastify request with authenticated user context
 * Extended with user property by Passport JWT strategy
 * Contains AuthUser object from JWT validation
 */
export interface AuthenticatedRequest {
  user?: AuthUser
}
