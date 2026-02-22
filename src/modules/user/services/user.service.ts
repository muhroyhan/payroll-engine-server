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
import { PrismaService } from '@src/database/prisma.service'
import { AUTH_CONFIG } from '@src/modules/auth/auth.config'
import { CreateUserDto, UpdateUserDto, UserDto } from '../dto'

@Injectable()
export class UserService extends BaseService<
  UserDto,
  CreateUserDto,
  UpdateUserDto
> {
  constructor(private prisma: PrismaService) {
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
    const where: Prisma.UserWhereInput = {
      tenantId: auditContext.tenantId,
      ...(searchFilter ?? {}),
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: offset,
        take: normalized.limit,
        orderBy: this.buildSortConfig(normalized.sortBy, normalized.sortOrder),
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

  async findOne(id: string, auditContext: AuditContext): Promise<UserDto> {
    this.logWithContext('log', `Fetching user ${id}`, auditContext)

    const user = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId: auditContext.tenantId,
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

    const user = await this.prisma.user.create({
      data: {
        tenantId: auditContext.tenantId,
        email: normalizedEmail,
        fullName: createDto.fullName,
        password,
        role: createDto.role ?? 'viewer',
        isActive: createDto.isActive ?? true,
        createdBy: auditContext.userFullName,
        updatedBy: auditContext.userFullName,
      },
    })

    return this.toDto(user)
  }

  async update(
    id: string,
    updateDto: UpdateUserDto,
    auditContext: AuditContext,
  ): Promise<UserDto> {
    this.logWithContext('log', `Updating user ${id}`, auditContext)

    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId: auditContext.tenantId,
      },
    })

    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    const data: Prisma.UserUpdateInput = {
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

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    })

    return this.toDto(updated)
  }

  async delete(id: string, auditContext: AuditContext): Promise<void> {
    this.logWithContext('log', `Deleting user ${id}`, auditContext)

    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId: auditContext.tenantId,
      },
    })

    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    const [auditLogsCount, payslipRunsCount] = await Promise.all([
      this.prisma.auditLogs.count({
        where: {
          actorUserId: id,
          tenantId: auditContext.tenantId,
        },
      }),
      this.prisma.payslipRun.count({
        where: {
          runByUserId: id,
          tenantId: auditContext.tenantId,
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

    await this.prisma.user.delete({
      where: { id },
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

  private toDto(user: User): UserDto {
    return {
      id: user.id,
      tenantId: user.tenantId,
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

  private mapToDto(users: User[]): UserDto[] {
    return users.map((user) => this.toDto(user))
  }
}
