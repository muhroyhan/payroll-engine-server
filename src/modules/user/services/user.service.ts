import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma, User } from '@prismaclient/client'
import * as bcrypt from 'bcrypt'

import { BaseService } from '@src/common/services'
import { PaginatedResponse, PaginationDto } from '@src/common/dto'
import type { AuditContext } from '@src/common/types'
import { AbilityFactory } from '@src/common/casl'
import { PrismaService } from '@src/database/prisma.service'
import { AUTH_CONFIG } from '@src/modules/auth/auth.config'
import {
  CreateUserDto,
  UpdateUserDto,
  UserDto,
  UserTenantOptionDto,
} from '../dto'

@Injectable()
export class UserService extends BaseService<
  UserDto,
  CreateUserDto,
  UpdateUserDto
> {
  constructor(
    private prisma: PrismaService,
    private abilityFactory: AbilityFactory,
  ) {
    super(UserService.name)
  }

  async findAll(
    pagination: PaginationDto,
    auditContext: AuditContext,
  ): Promise<PaginatedResponse<UserDto>> {
    this.logWithContext('log', 'Fetching tenant users', auditContext)

    const normalized = this.normalizePaginationDto(pagination)
    const offset = this.calculateOffset(normalized.page, normalized.limit)

    const searchFilter = this.buildSearchFilter(normalized.search)
    const scopeFilter = this.abilityFactory.buildUserWhere(auditContext, 'read')
    const where: Prisma.UserWhereInput = {
      ...(scopeFilter ?? {}),
      ...(searchFilter ?? {}),
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: offset,
        take: normalized.limit,
        orderBy: this.buildSortConfig(normalized.sortBy, normalized.sortOrder, [
          'id',
          'fullName',
          'email',
          'role',
          'isActive',
          'createdAt',
        ]),
        include: {
          tenant: {
            select: {
              name: true,
              code: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ])

    return new PaginatedResponse(
      this.mapToDto(data),
      total,
      normalized.page,
      normalized.limit,
    )
  }

  async findTenantOptions(search?: string): Promise<UserTenantOptionDto[]> {
    const where: Prisma.TenantWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}

    return this.prisma.tenant.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: {
        name: 'asc',
      },
    })
  }

  async findOne(id: number, auditContext: AuditContext): Promise<UserDto> {
    this.logWithContext('log', `Fetching user ${id}`, auditContext)

    const tenantScope = this.abilityFactory.buildUserWhere(auditContext, 'read')
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        ...(tenantScope ?? {}),
      },
    })

    if (!user) {
      this.logWithContext('warn', `User ${id} not found`, auditContext)
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    return this.toDto(user)
  }

  async create(
    createDto: CreateUserDto,
    auditContext: AuditContext,
  ): Promise<UserDto> {
    const normalizedEmail = createDto.email.toLowerCase().trim()

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      throw new BadRequestException(
        `User with email ${normalizedEmail} already exists`,
      )
    }

    const password = await bcrypt.hash(
      createDto.password,
      AUTH_CONFIG.PASSWORD.BCRYPT_SALT_ROUNDS,
    )

    this.logWithContext('log', `Creating user ${normalizedEmail}`, auditContext)

    const actorManagedTenantId =
      this.abilityFactory.resolveManagedTenantId(auditContext)

    if (auditContext.role !== 'superadmin') {
      if (createDto.tenantId !== actorManagedTenantId) {
        throw new BadRequestException('tenantId must match your tenant context')
      }
    }

    const tenantId =
      auditContext.role === 'superadmin'
        ? (createDto.tenantId ?? null)
        : actorManagedTenantId

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          tenantId,
          email: normalizedEmail,
          fullName: createDto.fullName,
          password,
          role: createDto.role ?? 'viewer',
          isActive: createDto.isActive ?? true,
          createdBy: auditContext.userFullName,
          updatedBy: auditContext.userFullName,
        },
      })

      await this.writeAuditLog(tx, {
        action: 'CREATE',
        entity: 'User',
        entityId: createdUser.id,
        tenantId: createdUser.tenantId,
        auditContext,
        afterData: this.omitAuditFields(
          createdUser as unknown as Record<string, unknown>,
          ['password', 'refreshToken'],
        ),
      })

      return createdUser
    })

    return this.toDto(user)
  }

  async update(
    id: number,
    updateDto: UpdateUserDto,
    auditContext: AuditContext,
  ): Promise<UserDto> {
    this.logWithContext('log', `Updating user ${id}`, auditContext)

    const tenantScope = this.abilityFactory.buildUserWhere(
      auditContext,
      'manage',
    )
    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        ...(tenantScope ?? {}),
      },
    })

    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    const data: Prisma.UserUncheckedUpdateInput = {
      updatedBy: auditContext.userFullName,
    }

    if (updateDto.email) {
      const normalizedEmail = updateDto.email.toLowerCase().trim()
      const duplicate = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      })

      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException(
          `User with email ${normalizedEmail} already exists`,
        )
      }

      data.email = normalizedEmail
    }

    if (updateDto.password) {
      data.password = await bcrypt.hash(
        updateDto.password,
        AUTH_CONFIG.PASSWORD.BCRYPT_SALT_ROUNDS,
      )
    }

    if (updateDto.fullName !== undefined) data.fullName = updateDto.fullName
    if (updateDto.role !== undefined) data.role = updateDto.role
    if (updateDto.isActive !== undefined) data.isActive = updateDto.isActive

    const actorManagedTenantId =
      this.abilityFactory.resolveManagedTenantId(auditContext)

    if (updateDto.tenantId !== undefined) {
      if (
        auditContext.role !== 'superadmin' &&
        updateDto.tenantId !== actorManagedTenantId
      ) {
        throw new BadRequestException('tenantId must match your tenant context')
      }

      data.tenantId = updateDto.tenantId
    }

    if (
      auditContext.role === 'superadmin' &&
      updateDto.role === 'superadmin' &&
      updateDto.tenantId === undefined
    ) {
      data.tenantId = null
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data,
      })

      await this.writeAuditLog(tx, {
        action: 'UPDATE',
        entity: 'User',
        entityId: id,
        tenantId: updatedUser.tenantId,
        auditContext,
        beforeData: this.omitAuditFields(
          existing as unknown as Record<string, unknown>,
          ['password', 'refreshToken'],
        ),
        afterData: this.omitAuditFields(
          updatedUser as unknown as Record<string, unknown>,
          ['password', 'refreshToken'],
        ),
      })

      return updatedUser
    })

    return this.toDto(updated)
  }

  async delete(id: number, auditContext: AuditContext): Promise<void> {
    this.logWithContext('log', `Deleting user ${id}`, auditContext)

    const tenantScope = this.abilityFactory.buildUserWhere(
      auditContext,
      'manage',
    )
    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        ...(tenantScope ?? {}),
      },
    })

    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    const managedTenantId =
      this.abilityFactory.resolveManagedTenantId(auditContext)
    const relationTenantFilter =
      managedTenantId === null ? {} : { tenantId: managedTenantId }

    const [auditLogsCount, payslipRunsCount] = await Promise.all([
      this.prisma.auditLogs.count({
        where: {
          actorUserId: id,
          ...relationTenantFilter,
        },
      }),
      this.prisma.payslipRun.count({
        where: {
          runByUserId: id,
          ...relationTenantFilter,
        },
      }),
    ])

    const assignedModules: string[] = []
    if (auditLogsCount > 0)
      assignedModules.push(`Audit Logs (${auditLogsCount})`)
    if (payslipRunsCount > 0)
      assignedModules.push(`Payslip Runs (${payslipRunsCount})`)

    if (assignedModules.length > 0) {
      const message = `Cannot delete user: It is assigned to ${assignedModules.join(', ')}. Please remove all related data first.`
      this.logWithContext('warn', message, auditContext)
      throw new BadRequestException(message)
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.delete({
        where: { id },
      })

      await this.writeAuditLog(tx, {
        action: 'DELETE',
        entity: 'User',
        entityId: id,
        tenantId: existing.tenantId,
        auditContext,
        beforeData: this.omitAuditFields(
          existing as unknown as Record<string, unknown>,
          ['password', 'refreshToken'],
        ),
      })
    })
  }

  protected buildSearchFilter(query?: string): Prisma.UserWhereInput {
    if (!query) return {}

    return {
      OR: [
        { fullName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    }
  }

  private toDto(
    user: User & { tenant?: { name: string; code: string } | null },
  ): UserDto {
    return {
      id: user.id,
      tenantId: user.tenantId,
      tenantName: user.tenant?.name,
      tenantCode: user.tenant?.code,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      createdBy: user.createdBy,
      createdAt: user.createdAt,
      updatedBy: user.updatedBy,
      updatedAt: user.updatedAt,
    }
  }

  private mapToDto(
    users: Array<User & { tenant?: { name: string; code: string } | null }>,
  ): UserDto[] {
    return users.map((user) => this.toDto(user))
  }
}
