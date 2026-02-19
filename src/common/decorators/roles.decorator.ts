import { SetMetadata } from '@nestjs/common'
import type { Role } from '@src/common/types/role.type'

export const ROLES_KEY = 'roles'

/**
 * Declares which roles are allowed to access a route.
 * Works together with RolesGuard (registered per-route or globally).
 *
 * @example
 * @Roles('tenant_admin')
 * @Roles('tenant_admin', 'payroll_officer')
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)
