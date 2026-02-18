import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest()
    if (!req.user?.tenantId) return false
    req.tenantId = req.user.tenantId
    return true
  }
}
