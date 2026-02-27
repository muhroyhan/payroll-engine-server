import type { Role } from '@src/common/types/role.type'

export type JwtPayload = {
  sub: number
  email: string
  fullName: string
  role: Role
  tenantId: number | null
}
