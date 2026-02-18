import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from '@prismaclient/client'
import { ROLES_KEY } from './require-role.decorator'

interface UserWithRole {
  role: Role
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>(
      ROLES_KEY,
      context.getHandler(),
    )

    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user as UserWithRole | undefined

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Access denied. Insufficient permissions.',
        error: 'FORBIDDEN',
      })
    }

    return true
  }
}
