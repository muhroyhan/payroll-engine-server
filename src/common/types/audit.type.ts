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
  userId: string // Current user performing the action
  tenantId: string // Tenant context
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ'
  timestamp: Date
  metadata?: Record<string, any>
}

/**
 * JWT payload added to request by Passport strategy
 */
export interface JwtPayload {
  sub: string // User ID
  tenantId: string // Tenant ID
  email?: string
  roles?: string[]
}

/**
 * Fastify request with authenticated user context
 * Extended with user property by JWT strategy
 */
export interface AuthenticatedRequest {
  user: JwtPayload
}
