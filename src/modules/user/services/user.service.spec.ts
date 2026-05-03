import { BadRequestException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { UserService } from './user.service'
import type { PrismaService } from '@src/database/prisma.service'
import type { AbilityFactory } from '@src/common/casl'
import type { AuditContext } from '@src/common/types'

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}))

const makeAuditContext = (
  overrides: Partial<AuditContext> = {},
): AuditContext => ({
  userId: 1,
  userFullName: 'Admin User',
  role: 'tenant_admin',
  tenantId: 1,
  action: 'READ',
  timestamp: new Date(),
  ...overrides,
})

describe('UserService', () => {
  const prismaMock = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    tenant: {
      findMany: jest.fn(),
    },
    auditLogs: {
      count: jest.fn(),
    },
    payslipRun: {
      count: jest.fn(),
    },
  }

  const abilityFactoryMock = {
    buildUserWhere: jest.fn(),
    resolveManagedTenantId: jest.fn(),
  }

  let service: UserService

  beforeEach(() => {
    jest.clearAllMocks()
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed')
    service = new UserService(
      prismaMock as unknown as PrismaService,
      abilityFactoryMock as unknown as AbilityFactory,
    )
  })

  it('rejects create when non-superadmin tenantId mismatches managed tenant', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    abilityFactoryMock.resolveManagedTenantId.mockReturnValue(1)

    await expect(
      service.create(
        {
          email: 'user@acme.com',
          fullName: 'User One',
          password: 'Test12345!',
          role: 'viewer',
          tenantId: 2,
        },
        makeAuditContext({ role: 'tenant_admin', action: 'CREATE' }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('updates tenantId when superadmin provides tenantId in update DTO', async () => {
    abilityFactoryMock.buildUserWhere.mockReturnValue(null)
    abilityFactoryMock.resolveManagedTenantId.mockReturnValue(null)

    prismaMock.user.findFirst.mockResolvedValue({
      id: 10,
      tenantId: 1,
      email: 'user@acme.com',
      password: 'hashed',
      fullName: 'User One',
      role: 'viewer',
      isActive: true,
      refreshToken: null,
      createdAt: new Date(),
      createdBy: 'seed',
      updatedAt: new Date(),
      updatedBy: 'seed',
    })

    prismaMock.user.update.mockResolvedValue({
      id: 10,
      tenantId: 2,
      email: 'user@acme.com',
      password: 'hashed',
      fullName: 'User One',
      role: 'viewer',
      isActive: true,
      refreshToken: null,
      createdAt: new Date(),
      createdBy: 'seed',
      updatedAt: new Date(),
      updatedBy: 'seed',
    })

    await service.update(
      10,
      { tenantId: 2 },
      makeAuditContext({
        role: 'superadmin',
        tenantId: null,
        action: 'UPDATE',
      }),
    )

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: 2 }),
      }),
    )
  })

  it('falls back to createdAt sort when sortBy field is not allowlisted', async () => {
    abilityFactoryMock.buildUserWhere.mockReturnValue({ tenantId: 1 })
    prismaMock.user.findMany.mockResolvedValue([])
    prismaMock.user.count.mockResolvedValue(0)

    await service.findAll(
      {
        page: 1,
        limit: 10,
        sortBy: 'unknownField',
        sortOrder: 'asc',
      },
      makeAuditContext(),
    )

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      }),
    )
  })
})
