import type { Role } from './role.type'

export type AuthUser = {
  userId: number
  email: string
  fullName: string
  role: Role
  tenantId: number
}
