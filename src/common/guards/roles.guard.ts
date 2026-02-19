import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '@src/common/decorators/roles.decorator'
import type { Role } from '@src/common/types/role.type'
import type { AuthUser } from '@src/common/types/auth-user.type'

/**
 * Role-based Authorization Guard.
 * Apply per-route with @Roles() decorator — routes without @Roles() pass through.
 * Must be used AFTER JwtAuthGuard (which populates request.user).
 *
 * @example
 * @UseGuards(RolesGuard)
 * @Roles('tenant_admin')
 * @Get('admin-only')
 * getAdminData() {}
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])

    // No @Roles() decorator → no restriction
    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>()
    const user = request.user

    if (!user) {
      throw new ForbiddenException('No authenticated user found')
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Requires one of the following roles: ${requiredRoles.join(', ')}`,
      )
    }

    return true
  }
}
