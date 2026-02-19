/**
 * Role type mirroring the Prisma Role enum.
 * Defined here so common layers (guards, decorators, types) don't import from ORM directly.
 */
export type Role = 'tenant_admin' | 'payroll_officer' | 'viewer'
