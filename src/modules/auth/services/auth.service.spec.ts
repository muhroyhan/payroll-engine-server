import { UnauthorizedException } from '@nestjs/common'
import type { JwtSignOptions } from '@nestjs/jwt'
import { JwtService } from '@nestjs/jwt'
import { createHash } from 'crypto'
import * as bcrypt from 'bcrypt'
import { AuthService } from '@src/modules/auth/services/auth.service'
import { EmailThrottlerGuard } from '@src/modules/auth/guards/email-throttler.guard'
import { PrismaService } from '@src/database/prisma.service'
import { AUTH_CONFIG } from '@src/modules/auth/auth.config'
import type { User } from '@prismaclient/client'
import type { JwtPayload } from '@src/modules/auth/types/jwt-payload.type'

// ─────────────────────────────────────────────────────────────────────────────
// Mock types
// ─────────────────────────────────────────────────────────────────────────────

type MockPrisma = {
  user: {
    findFirst: jest.MockedFunction<
      (args: { where: Record<string, unknown> }) => Promise<User | null>
    >
    findUnique: jest.MockedFunction<
      (args: { where: Record<string, unknown> }) => Promise<User | null>
    >
    update: jest.MockedFunction<
      (args: {
        where: Record<string, unknown>
        data: Record<string, unknown>
      }) => Promise<User>
    >
  }
  tenant: {
    findUnique: jest.MockedFunction<
      (args: {
        where: Record<string, unknown>
        select: Record<string, unknown>
      }) => Promise<{ name: string } | null>
    >
  }
}

type MockJwt = {
  signAsync: jest.MockedFunction<
    (
      payload: Record<string, unknown>,
      options?: JwtSignOptions,
    ) => Promise<string>
  >
  verifyAsync: jest.MockedFunction<(token: string) => Promise<JwtPayload>>
}

type MockThrottler = {
  recordFailedAttempt: jest.MockedFunction<(email: string) => void>
  clearAttempts: jest.MockedFunction<(email: string) => void>
  canActivate: jest.MockedFunction<() => boolean>
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const PLAIN_PASSWORD = 'Test12345!'
// Pre-computed bcrypt hash — only used as the stored value in the User fixture;
// actual compare() is mocked where needed to avoid real hashing in tests
const HASHED_PASSWORD =
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PVb3Wy'

function baseUser(): User {
  return {
    id: 1,
    email: 'admin@example.com',
    password: HASHED_PASSWORD,
    fullName: 'Test Admin',
    role: 'tenant_admin',
    tenantId: 1,
    isActive: true,
    refreshToken: null,
    createdAt: new Date(),
    createdBy: 'system',
    updatedAt: new Date(),
    updatedBy: 'system',
  }
}

const makeUser = (overrides: Partial<User> = {}): User => ({
  ...baseUser(),
  ...overrides,
})

// ─────────────────────────────────────────────────────────────────────────────
// Mock factories
// ─────────────────────────────────────────────────────────────────────────────

function makePrismaMock(userOverrides: Partial<User> = {}): MockPrisma {
  const user = makeUser(userOverrides)
  return {
    user: {
      findFirst: jest.fn().mockResolvedValue(user),
      findUnique: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockResolvedValue(user),
    },
    tenant: {
      findUnique: jest.fn().mockResolvedValue({
        name: 'Test Tenant',
      }),
    },
  }
}

function makeJwtMock(): MockJwt {
  return {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
    verifyAsync: jest.fn().mockResolvedValue({
      sub: 1,
      email: 'admin@example.com',
      fullName: 'Test Admin',
      role: 'tenant_admin',
      tenantId: 1,
    }),
  }
}

function makeThrottlerMock(): MockThrottler {
  return {
    recordFailedAttempt: jest.fn(),
    clearAttempts: jest.fn(),
    canActivate: jest.fn().mockReturnValue(true),
  }
}

function makeService(userOverrides: Partial<User> = {}): {
  service: AuthService
  prisma: MockPrisma
  jwt: MockJwt
  throttler: MockThrottler
} {
  const prisma = makePrismaMock(userOverrides)
  const jwt = makeJwtMock()
  const throttler = makeThrottlerMock()
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
    throttler as unknown as EmailThrottlerGuard,
  )
  return { service, prisma, jwt, throttler }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  afterEach(() => jest.restoreAllMocks())

  // ─── validateUser ─────────────────────────────────────────────────────────

  describe('validateUser', () => {
    it('returns the user when credentials are valid', async () => {
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => true)
      const { service } = makeService()
      const user = await service.validateUser(
        'admin@example.com',
        PLAIN_PASSWORD,
      )
      expect(user.email).toBe('admin@example.com')
    })

    it('normalizes email to lowercase before querying DB', async () => {
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => true)
      const { service, prisma } = makeService()
      await service.validateUser('ADMIN@EXAMPLE.COM', PLAIN_PASSWORD)
      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ email: 'admin@example.com' }),
        }),
      )
    })

    it('normalizes email by trimming whitespace before querying DB', async () => {
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => true)
      const { service, prisma } = makeService()
      await service.validateUser('  admin@example.com  ', PLAIN_PASSWORD)
      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ email: 'admin@example.com' }),
        }),
      )
    })

    it('throws 401 for unregistered email — does NOT record a failed attempt', async () => {
      const { service, prisma, throttler } = makeService()
      prisma.user.findFirst.mockResolvedValue(null) // no user found

      await expect(
        service.validateUser('ghost@example.com', PLAIN_PASSWORD),
      ).rejects.toBeInstanceOf(UnauthorizedException)

      expect(throttler.recordFailedAttempt).not.toHaveBeenCalled()
    })

    it('throws 401 for inactive user — does NOT record a failed attempt', async () => {
      // The real query uses WHERE isActive: true, so an inactive user causes DB to return null
      const { service, prisma, throttler } = makeService()
      prisma.user.findFirst.mockResolvedValue(null)

      await expect(
        service.validateUser('admin@example.com', PLAIN_PASSWORD),
      ).rejects.toBeInstanceOf(UnauthorizedException)

      expect(throttler.recordFailedAttempt).not.toHaveBeenCalled()
    })

    it('throws 401 for wrong password AND records a failed attempt', async () => {
      const { service, throttler } = makeService()

      await expect(
        service.validateUser('admin@example.com', 'WrongPass1!'),
      ).rejects.toBeInstanceOf(UnauthorizedException)

      expect(throttler.recordFailedAttempt).toHaveBeenCalledTimes(1)
      expect(throttler.recordFailedAttempt).toHaveBeenCalledWith(
        'admin@example.com',
      )
    })

    it('unregistered and registered wrong-password both throw the same message (anti-enumeration)', async () => {
      const { service, prisma } = makeService()

      // Wrong password (user exists)
      let msgRegistered: string
      try {
        await service.validateUser('admin@example.com', 'WrongPass1!')
      } catch (e: unknown) {
        msgRegistered = e instanceof Error ? e.message : String(e)
      }

      // Unregistered email
      prisma.user.findFirst.mockResolvedValueOnce(null)
      let msgUnregistered: string
      try {
        await service.validateUser('ghost@example.com', 'WrongPass1!')
      } catch (e: unknown) {
        msgUnregistered = e instanceof Error ? e.message : String(e)
      }

      expect(msgRegistered!).toBe(AUTH_CONFIG.ERROR.INVALID_CREDENTIALS)
      expect(msgUnregistered!).toBe(AUTH_CONFIG.ERROR.INVALID_CREDENTIALS)
      expect(msgRegistered!).toBe(msgUnregistered!)
    })
  })

  // ─── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns accessToken, refreshToken, and safe user shape', async () => {
      const { service } = makeService()
      const user = makeUser()
      const result = await service.login(user)

      expect(result).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          tenantId: user.tenantId,
        },
      })
    })

    it('stores the SHA-256 hash of the refresh token in DB (not the plain token)', async () => {
      const { service, prisma, jwt } = makeService()
      const plainRefreshToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.token'
      jwt.signAsync
        .mockResolvedValueOnce('access-token') // first call = AT
        .mockResolvedValueOnce(plainRefreshToken) // second call = RT

      await service.login(makeUser())

      const storedHash = prisma.user.update.mock.calls[0][0].data.refreshToken
      const expectedHash = createHash('sha256')
        .update(plainRefreshToken)
        .digest('hex')
      expect(storedHash).toBe(expectedHash)
      expect(storedHash).not.toBe(plainRefreshToken)
    })

    it('calls clearAttempts after successful login', async () => {
      const { service, throttler } = makeService()
      const user = makeUser()
      await service.login(user)
      expect(throttler.clearAttempts).toHaveBeenCalledWith(user.email)
    })

    it('safe user response does NOT include password or refreshToken', async () => {
      const { service } = makeService()
      const result = await service.login(makeUser())
      expect(Object.keys(result.user)).not.toContain('password')
      expect(Object.keys(result.user)).not.toContain('refreshToken')
    })

    it('access token does NOT contain jti claim', async () => {
      const { service, jwt } = makeService()
      await service.login(makeUser())
      // First signAsync call is the access token
      const atPayload = jwt.signAsync.mock.calls[0][0]
      expect(atPayload.jti).toBeUndefined()
    })

    it('refresh token contains a jti claim (UUID)', async () => {
      const { service, jwt } = makeService()
      await service.login(makeUser())
      // Second signAsync call is the refresh token
      const rtPayload = jwt.signAsync.mock.calls[1][0]
      expect(typeof rtPayload.jti).toBe('string')
      expect(rtPayload.jti).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      )
    })

    it('each login generates a different jti (uniqueness guarantee)', async () => {
      const { service, jwt } = makeService()
      await service.login(makeUser())
      const jti1 = jwt.signAsync.mock.calls[1][0].jti
      await service.login(makeUser())
      const jti2 = jwt.signAsync.mock.calls[3][0].jti
      expect(jti1).not.toBe(jti2)
    })
  })

  // ─── refresh ──────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('succeeds when stored hash matches SHA-256(refreshToken)', async () => {
      const plainToken = 'valid-refresh-token-string'
      const storedHash = createHash('sha256').update(plainToken).digest('hex')
      const { service } = makeService({ refreshToken: storedHash })

      const result = await service.refresh(plainToken)
      expect(result.accessToken).toBeDefined()
    })

    it('throws 401 when JWT signature is invalid', async () => {
      const { service, jwt } = makeService()
      jwt.verifyAsync.mockRejectedValue(new Error('invalid signature'))

      await expect(service.refresh('bad.jwt.token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      )
    })

    it('throws 401 when user is not found', async () => {
      const { service, prisma } = makeService()
      prisma.user.findUnique.mockResolvedValue(null)

      await expect(service.refresh('any-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      )
    })

    it('throws 401 when user is inactive', async () => {
      const { service } = makeService({ isActive: false })

      await expect(service.refresh('any-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      )
    })

    it('throws 401 when User.refreshToken is null (logged out)', async () => {
      const { service } = makeService({ refreshToken: null })

      await expect(service.refresh('any-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      )
    })

    it('throws 401 when provided token does not match stored hash (rotation attack)', async () => {
      const storedHash = createHash('sha256').update('token-A').digest('hex')
      const { service } = makeService({ refreshToken: storedHash })

      // token-B has a completely different hash even though first 72 chars may overlap
      await expect(service.refresh('token-B')).rejects.toBeInstanceOf(
        UnauthorizedException,
      )
    })

    it('uses SHA-256 comparison — two JWT tokens sharing the same 72-byte prefix are distinguished', async () => {
      // This is the regression test for the bcrypt 72-byte truncation bug.
      // bcrypt silently truncates at 72 bytes, so tokens that differ only after
      // byte 72 would compare as equal. SHA-256 has no such limit.
      const prefix = 'A'.repeat(72)
      const tokenA = prefix + '-AAAA'
      const tokenB = prefix + '-BBBB'
      const hashA = createHash('sha256').update(tokenA).digest('hex')
      const hashB = createHash('sha256').update(tokenB).digest('hex')

      // Sanity: SHA-256 distinguishes them
      expect(hashA).not.toBe(hashB)

      // Store hash of tokenA, then try tokenB — must be rejected
      const { service } = makeService({ refreshToken: hashA })
      await expect(service.refresh(tokenB)).rejects.toBeInstanceOf(
        UnauthorizedException,
      )
    })
  })

  // ─── getCurrentUser ───────────────────────────────────────────────────────

  describe('getCurrentUser', () => {
    it('returns safe user without password or refreshToken', async () => {
      const { service } = makeService()
      const result = await service.getCurrentUser(1)
      expect(result).toMatchObject({
        id: 1,
        email: 'admin@example.com',
        role: 'tenant_admin',
        tenantId: 1,
      })
      expect(Object.keys(result)).not.toContain('password')
      expect(Object.keys(result)).not.toContain('refreshToken')
    })

    it('throws 401 when user not found', async () => {
      const { service, prisma } = makeService()
      prisma.user.findUnique.mockResolvedValue(null)

      await expect(service.getCurrentUser(999999)).rejects.toBeInstanceOf(
        UnauthorizedException,
      )
    })

    it('throws 401 when user is inactive', async () => {
      const { service } = makeService({ isActive: false })

      await expect(service.getCurrentUser(1)).rejects.toBeInstanceOf(
        UnauthorizedException,
      )
    })
  })

  // ─── logout ───────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('sets refreshToken to null in DB', async () => {
      const { service, prisma } = makeService()
      await service.logout(1)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { refreshToken: null },
      })
    })

    it('returns { success: true }', async () => {
      const { service } = makeService()
      const result = await service.logout(1)
      expect(result).toEqual({ success: true })
    })
  })
})
