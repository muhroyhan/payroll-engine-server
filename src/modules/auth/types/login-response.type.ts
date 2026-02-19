import type { Role } from '@src/common/types/role.type'

export type SafeUser = {
  id: string
  email: string
  fullName: string
  role: Role
  tenantId: string
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  user: SafeUser
}
