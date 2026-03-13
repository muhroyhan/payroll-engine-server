import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { $Enums, Prisma, SalaryComponent } from '@prismaclient/client'

import { BaseService } from '@src/common/services'
import { PaginatedResponse, PaginationDto } from '@src/common/dto'
import type { AuditContext } from '@src/common/types'
import { AbilityFactory } from '@src/common/casl'
import { PrismaService } from '@src/database/prisma.service'
import {
  CreateSalaryComponentDto,
  SalaryComponentDto,
  UpdateSalaryComponentDto,
} from '../dto'

@Injectable()
export class SalaryComponentService extends BaseService<
  SalaryComponentDto,
  CreateSalaryComponentDto,
  UpdateSalaryComponentDto
> {
  constructor(
    private prisma: PrismaService,
    private abilityFactory: AbilityFactory,
  ) {
    super(SalaryComponentService.name)
  }

  async findAll(
    pagination: PaginationDto,
    auditContext: AuditContext,
  ): Promise<PaginatedResponse<SalaryComponentDto>> {
    this.logWithContext('log', 'Fetching salary components', auditContext)

    const normalized = this.normalizePaginationDto(pagination)
    const offset = this.calculateOffset(normalized.page, normalized.limit)

    const searchFilter = this.buildSearchFilter(normalized.search)
    const scopeFilter = this.abilityFactory.buildSalaryComponentWhere(
      auditContext,
      'read',
    )

    const where: Prisma.SalaryComponentWhereInput = {
      ...(scopeFilter ?? {}),
      ...(searchFilter ?? {}),
    }

    const [data, total] = await Promise.all([
      this.prisma.salaryComponent.findMany({
        where,
        skip: offset,
        take: normalized.limit,
        orderBy: this.buildSortConfig(normalized.sortBy, normalized.sortOrder, [
          'id',
          'name',
          'type',
          'calculationType',
          'defaultValue',
          'isTaxable',
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
      this.prisma.salaryComponent.count({ where }),
    ])

    return new PaginatedResponse(
      this.mapToDto(data),
      total,
      normalized.page,
      normalized.limit,
    )
  }

  async findOne(
    id: number,
    auditContext: AuditContext,
  ): Promise<SalaryComponentDto> {
    this.logWithContext('log', `Fetching salary component ${id}`, auditContext)

    const scopeFilter = this.abilityFactory.buildSalaryComponentWhere(
      auditContext,
      'read',
    )

    const salaryComponent = await this.prisma.salaryComponent.findFirst({
      where: {
        id,
        ...(scopeFilter ?? {}),
      },
      include: {
        tenant: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    })

    if (!salaryComponent) {
      throw new NotFoundException(`Salary component with ID ${id} not found`)
    }

    return this.toDto(salaryComponent)
  }

  async create(
    createDto: CreateSalaryComponentDto,
    auditContext: AuditContext,
  ): Promise<SalaryComponentDto> {
    const managedTenantId =
      this.abilityFactory.resolveManagedTenantId(auditContext)

    let tenantId: number

    if (auditContext.role === 'superadmin') {
      if (createDto.tenantId === undefined) {
        throw new BadRequestException('tenantId is required for superadmin')
      }

      tenantId = createDto.tenantId
    } else {
      if (managedTenantId === null) {
        throw new BadRequestException('Unable to resolve tenant scope')
      }

      if (
        createDto.tenantId !== undefined &&
        createDto.tenantId !== managedTenantId
      ) {
        throw new BadRequestException('tenantId must match your tenant context')
      }

      tenantId = managedTenantId
    }

    const salaryComponent = await this.prisma.$transaction(async (tx) => {
      const created = await tx.salaryComponent.create({
        data: {
          tenantId,
          name: createDto.name,
          type: createDto.type ?? 'allowance',
          calculationType: createDto.calculationType ?? 'fixed',
          defaultValue: createDto.defaultValue,
          isTaxable: createDto.isTaxable ?? false,
          isActive: createDto.isActive ?? true,
          createdBy: auditContext.userFullName,
          updatedBy: auditContext.userFullName,
        },
      })

      await this.writeAuditLog(tx, {
        action: 'CREATE',
        entity: 'SalaryComponent',
        entityId: created.id,
        tenantId: created.tenantId,
        auditContext,
        afterData: created as unknown as Record<string, unknown>,
      })

      return created
    })

    return this.toDto(salaryComponent)
  }

  async update(
    id: number,
    updateDto: UpdateSalaryComponentDto,
    auditContext: AuditContext,
  ): Promise<SalaryComponentDto> {
    const scopeFilter = this.abilityFactory.buildSalaryComponentWhere(
      auditContext,
      'manage',
    )

    const existing = await this.prisma.salaryComponent.findFirst({
      where: {
        id,
        ...(scopeFilter ?? {}),
      },
    })

    if (!existing) {
      throw new NotFoundException(`Salary component with ID ${id} not found`)
    }

    const data: Prisma.SalaryComponentUncheckedUpdateInput = {
      updatedBy: auditContext.userFullName,
    }

    if (updateDto.name !== undefined) data.name = updateDto.name
    if (updateDto.type !== undefined) data.type = updateDto.type
    if (updateDto.calculationType !== undefined)
      data.calculationType = updateDto.calculationType
    if (updateDto.defaultValue !== undefined)
      data.defaultValue = updateDto.defaultValue
    if (updateDto.isTaxable !== undefined) data.isTaxable = updateDto.isTaxable
    if (updateDto.isActive !== undefined) data.isActive = updateDto.isActive

    const managedTenantId =
      this.abilityFactory.resolveManagedTenantId(auditContext)

    if (updateDto.tenantId !== undefined) {
      if (auditContext.role !== 'superadmin') {
        throw new BadRequestException('Only superadmin can update tenantId')
      }

      data.tenantId = updateDto.tenantId
    } else if (auditContext.role !== 'superadmin' && managedTenantId !== null) {
      data.tenantId = managedTenantId
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSalaryComponent = await tx.salaryComponent.update({
        where: { id },
        data,
      })

      await this.writeAuditLog(tx, {
        action: 'UPDATE',
        entity: 'SalaryComponent',
        entityId: id,
        tenantId: updatedSalaryComponent.tenantId,
        auditContext,
        beforeData: existing as unknown as Record<string, unknown>,
        afterData: updatedSalaryComponent as unknown as Record<string, unknown>,
      })

      return updatedSalaryComponent
    })

    return this.toDto(updated)
  }

  async delete(id: number, auditContext: AuditContext): Promise<void> {
    const scopeFilter = this.abilityFactory.buildSalaryComponentWhere(
      auditContext,
      'manage',
    )

    const existing = await this.prisma.salaryComponent.findFirst({
      where: {
        id,
        ...(scopeFilter ?? {}),
      },
    })

    if (!existing) {
      throw new NotFoundException(`Salary component with ID ${id} not found`)
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.salaryComponent.delete({
        where: { id },
      })

      await this.writeAuditLog(tx, {
        action: 'DELETE',
        entity: 'SalaryComponent',
        entityId: id,
        tenantId: existing.tenantId,
        auditContext,
        beforeData: existing as unknown as Record<string, unknown>,
      })
    })
  }

  protected buildSearchFilter(
    query?: string,
  ): Prisma.SalaryComponentWhereInput {
    if (!query) return {}

    const normalizedQuery = query.trim().toLowerCase()
    const orFilters: Prisma.SalaryComponentWhereInput[] = [
      { name: { contains: query, mode: 'insensitive' } },
    ]

    if (normalizedQuery === 'allowance' || normalizedQuery === 'deduction') {
      orFilters.push({
        type: {
          equals: normalizedQuery as $Enums.SalaryType,
        },
      })
    }

    if (normalizedQuery === 'fixed' || normalizedQuery === 'percentage') {
      orFilters.push({
        calculationType: {
          equals: normalizedQuery as $Enums.CalculationType,
        },
      })
    }

    return {
      OR: orFilters,
    }
  }

  private toDto(
    salaryComponent: SalaryComponent & {
      tenant?: { name: string; code: string } | null
    },
  ): SalaryComponentDto {
    return {
      id: salaryComponent.id,
      tenantId: salaryComponent.tenantId,
      tenantName: salaryComponent.tenant?.name,
      tenantCode: salaryComponent.tenant?.code,
      name: salaryComponent.name,
      type: salaryComponent.type,
      calculationType: salaryComponent.calculationType,
      defaultValue: salaryComponent.defaultValue.toString(),
      isTaxable: salaryComponent.isTaxable,
      isActive: salaryComponent.isActive,
      createdBy: salaryComponent.createdBy,
      createdAt: salaryComponent.createdAt,
      updatedBy: salaryComponent.updatedBy,
      updatedAt: salaryComponent.updatedAt,
    }
  }

  private mapToDto(
    salaryComponents: Array<
      SalaryComponent & { tenant?: { name: string; code: string } | null }
    >,
  ): SalaryComponentDto[] {
    return salaryComponents.map((salaryComponent) =>
      this.toDto(salaryComponent),
    )
  }
}
