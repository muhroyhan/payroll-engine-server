import { Body, Controller, Post, UseGuards } from '@nestjs/common'

import { AuthService } from '../services/auth.service'
import { RefreshDto } from '../dto/refresh.dto'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { LoginResponse } from '../types/login-response.type'
import { LoginDto } from '../dto/login.dto'
import { CurrentUser } from '@src/common/decorators/current-user.decorator'
import type { AuthUser } from '@src/common/types/auth-user.type'

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto): Promise<LoginResponse> {
    const user = await this.auth.validateUser(body.email, body.password)

    return this.auth.login(user)
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshDto): Promise<LoginResponse> {
    return this.auth.refresh(body.refreshToken || '')
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: AuthUser): Promise<{ success: true }> {
    return this.auth.logout(user.userId)
  }
}
