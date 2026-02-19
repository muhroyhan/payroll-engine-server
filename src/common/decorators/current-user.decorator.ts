import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { AuthUser } from '@src/common/types/auth-user.type'

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<{ user: AuthUser }>()
    return req.user
  },
)
