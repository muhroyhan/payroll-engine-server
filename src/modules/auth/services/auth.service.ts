import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'

import { JwtPayload } from '../types/jwt-payload.type'
import { LoginResponse, SafeUser } from '../types/login-response.type'
import { PrismaService } from '@src/database/prisma.service'
import { User } from '@prismaclient/client'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // ---------- helpers ----------

  private buildPayload(user: User): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    }
  }

  private toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tenantId: user.tenantId,
    }
  }

  private async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = this.buildPayload(user)

    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: '15m',
    })

    const refreshToken = await this.jwt.signAsync(payload, {
      expiresIn: '7d',
    })

    return { accessToken, refreshToken }
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hash = await bcrypt.hash(refreshToken, 10)

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hash },
    })
  }

  // ---------- public ----------

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { email, isActive: true },
    })

    if (!user) throw new UnauthorizedException()

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) throw new UnauthorizedException()

    return user
  }

  async login(user: User): Promise<LoginResponse> {
    const tokens = await this.generateTokens(user)

    await this.storeRefreshToken(user.id, tokens.refreshToken)

    return {
      ...tokens,
      user: this.toSafeUser(user),
    }
  }

  async refresh(refreshToken: string): Promise<LoginResponse> {
    const payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken)

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    })

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException()
    }

    const match = await bcrypt.compare(refreshToken, user.refreshToken)

    if (!match) throw new UnauthorizedException()

    const tokens = await this.generateTokens(user)
    await this.storeRefreshToken(user.id, tokens.refreshToken)

    return {
      ...tokens,
      user: this.toSafeUser(user),
    }
  }

  async logout(userId: string): Promise<{ success: true }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    })

    return { success: true }
  }
}
