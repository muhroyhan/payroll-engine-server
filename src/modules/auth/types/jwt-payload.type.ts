import type { Role } from '@src/common/types/role.type'

export type JwtPayload = {
  sub: string
  email: string
  role: Role
  tenantId: string
}
