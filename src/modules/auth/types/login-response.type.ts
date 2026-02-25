import type { Role } from '@src/common/types/role.type'

export type SafeUser = {
  id: number
  email: string
  fullName: string
  role: Role
  tenantId: number
  tenantName?: string
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  user: SafeUser
}
