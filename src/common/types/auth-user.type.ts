import type { Role } from './role.type'

export type AuthUser = {
  userId: string
  email: string
  role: Role
  tenantId: string
}
