import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { JwtPayload } from './types/jwt-payload.type'
import { PrismaService } from '@src/database/prisma.service'
import { Prisma } from '@prismaclient/client'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email, isActive: true },
    })

    if (!user) throw new UnauthorizedException('Invalid credentials')

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) throw new UnauthorizedException('Invalid credentials')

    return user
  }

  async login(user: Prisma.UserModel) {
    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    }

    return {
      access_token: await this.jwt.signAsync(payload),
    }
  }
}
