import { SetMetadata } from '@nestjs/common'
import { Role } from '@prismaclient/client'

export const ROLES_KEY = 'roles'

export const RequireRole = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)
