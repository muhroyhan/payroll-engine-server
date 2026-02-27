import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '@src/common/decorators/roles.decorator'
import { IS_PUBLIC_KEY } from '@src/common/decorators/public.decorator'
import type { Role } from '@src/common/types/role.type'
import type { AuthUser } from '@src/common/types/auth-user.type'
import { AbilityFactory } from '@src/common/casl'

/**
 * Role and ability based authorization guard.
 * Registered globally and evaluates CASL action permissions first.
 * For non-superadmin/viewer roles, it also enforces @Roles() decorator constraints.
 *
 * @example
 * @Roles('tenant_admin')
 * @Get('admin-only')
 * getAdminData() {}
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private abilityFactory: AbilityFactory,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])

    if (isPublic) {
      return true
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])

    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthUser; method: string }>()
    const user = request.user

    if (!user) {
      throw new ForbiddenException('No authenticated user found')
    }

    const action = request.method === 'GET' ? 'read' : 'manage'
    const ability = this.abilityFactory.createForUser(user)

    if (!ability.can(action, 'all')) {
      throw new ForbiddenException('Insufficient permission for this action')
    }

    if (user.role === 'superadmin' || user.role === 'viewer') {
      return true
    }

    // No @Roles() decorator → no restriction
    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Requires one of the following roles: ${requiredRoles.join(', ')}`,
      )
    }

    return true
  }
}
