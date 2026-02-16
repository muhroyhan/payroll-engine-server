import { Controller, Post, Body } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginAuthDto } from './dto/login-auth.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginAuthDto) {
    const user = await this.authService.validateUser(dto.email, dto.password)
    return this.authService.login(user)
  }
}
