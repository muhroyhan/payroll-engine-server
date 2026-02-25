import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma, Tenant } from '@prismaclient/client'

import { BaseService } from '@src/common/services'
import { PaginatedResponse, PaginationDto } from '@src/common/dto'
import { AuditContext } from '@src/common/types'
import { PrismaService } from '@src/database/prisma.service'
import { CreateTenantDto, TenantDto, UpdateTenantDto } from '../dto'

@Injectable()
export class TenantService extends BaseService<
  TenantDto,
  CreateTenantDto,
  UpdateTenantDto
> {
  constructor(private prisma: PrismaService) {
    super(TenantService.name)
  }

  /**
   * Get all tenants (admin only - no tenant filtering)
   * Used by super-admins to manage all tenants
   */
  async findAll(
    pagination: PaginationDto,
    auditContext: AuditContext,
  ): Promise<PaginatedResponse<TenantDto>> {
    this.logWithContext('log', 'Fetching all tenants', auditContext)

    // Normalize pagination values (ensure they are numbers, not strings)
    const normalized = this.normalizePaginationDto(pagination)

    const offset = this.calculateOffset(normalized.page, normalized.limit)

    const where: Prisma.TenantWhereInput = this.buildSearchFilter(
      normalized.search,
    )

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip: offset,
        take: normalized.limit,
        orderBy: this.buildSortConfig(normalized.sortBy, normalized.sortOrder),
      }),
      this.prisma.tenant.count({ where }),
    ])

    return new PaginatedResponse(
      this.mapToDto(data),
      total,
      normalized.page,
      normalized.limit,
    )
  }

  /**
   * Get single tenant by ID
   */
  async findOne(id: number, auditContext: AuditContext): Promise<TenantDto> {
    this.logWithContext('log', `Fetching tenant ${id}`, auditContext)

    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    })

    if (!tenant) {
      this.logWithContext('warn', `Tenant ${id} not found`, auditContext)
      throw new NotFoundException(`Tenant with ID ${id} not found`)
    }

    return this.toDto(tenant)
  }

  /**
   * Get tenant by code (public endpoint)
   */
  async findByCode(code: string): Promise<TenantDto> {
    this.logger.log(`Fetching tenant by code: ${code}`)

    const tenant = await this.prisma.tenant.findUnique({
      where: { code },
    })

    if (!tenant) {
      this.logger.warn(`Tenant with code ${code} not found`)
      throw new NotFoundException(`Tenant with code ${code} not found`)
    }

    return this.toDto(tenant)
  }

  /**
   * Create new tenant
   * Auto-generates tenant code with format: TNT-{increment number}
   */
  async create(
    createDto: CreateTenantDto,
    auditContext: AuditContext,
  ): Promise<TenantDto> {
    // Generate tenant code: TNT-{next increment number}
    const totalTenants = await this.prisma.tenant.count()
    const code = `TNT-${String(totalTenants + 1).padStart(6, '0')}`

    this.logWithContext(
      'log',
      `Creating new tenant: ${createDto.name} with code ${code}`,
      auditContext,
    )

    const tenant = await this.prisma.tenant.create({
      data: {
        name: createDto.name,
        code,
        createdBy: auditContext.userFullName,
        updatedBy: auditContext.userFullName,
      },
    })

    this.logWithContext(
      'log',
      `Tenant created successfully: ${tenant.id}`,
      auditContext,
    )

    return this.toDto(tenant)
  }

  /**
   * Update tenant
   */
  async update(
    id: number,
    updateDto: UpdateTenantDto,
    auditContext: AuditContext,
  ): Promise<TenantDto> {
    this.logWithContext('log', `Updating tenant ${id}`, auditContext)

    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    })

    if (!tenant) {
      this.logWithContext(
        'warn',
        `Tenant ${id} not found for update`,
        auditContext,
      )
      throw new NotFoundException(`Tenant with ID ${id} not found`)
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...updateDto,
        updatedBy: auditContext.userFullName,
      },
    })

    this.logWithContext(
      'log',
      `Tenant ${id} updated successfully`,
      auditContext,
    )

    return this.toDto(updated)
  }

  /**
   * Delete tenant
   * Prevents deletion if tenant has related data in other modules
   *
   * @throws BadRequestException if tenant has related data
   * @throws NotFoundException if tenant not found
   */
  async delete(id: number, auditContext: AuditContext): Promise<void> {
    this.logWithContext('log', `Deleting tenant ${id}`, auditContext)

    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    })

    if (!tenant) {
      this.logWithContext(
        'warn',
        `Tenant ${id} not found for deletion`,
        auditContext,
      )
      throw new NotFoundException(`Tenant with ID ${id} not found`)
    }

    // Check if tenant has related data in other modules
    const [usersCount, employeesCount, salaryComponentsCount] =
      await Promise.all([
        this.prisma.user.count({ where: { tenantId: id } }),
        this.prisma.employee.count({ where: { tenantId: id } }),
        this.prisma.salaryComponent.count({ where: { tenantId: id } }),
      ])

    // Aggregate check for other related data
    const [
      auditLogsCount,
      payslipPeriodsCount,
      payslipRunsCount,
      payslipsCount,
    ] = await Promise.all([
      this.prisma.auditLogs.count({ where: { tenantId: id } }),
      this.prisma.payslipPeriod.count({ where: { tenantId: id } }),
      this.prisma.payslipRun.count({ where: { tenantId: id } }),
      this.prisma.payslip.count({ where: { tenantId: id } }),
    ])

    // Build error message with assigned modules
    const assignedModules: string[] = []
    if (usersCount > 0) assignedModules.push(`Users (${usersCount})`)
    if (employeesCount > 0)
      assignedModules.push(`Employees (${employeesCount})`)
    if (salaryComponentsCount > 0)
      assignedModules.push(`Salary Components (${salaryComponentsCount})`)
    if (auditLogsCount > 0)
      assignedModules.push(`Audit Logs (${auditLogsCount})`)
    if (payslipPeriodsCount > 0)
      assignedModules.push(`Payslip Periods (${payslipPeriodsCount})`)
    if (payslipRunsCount > 0)
      assignedModules.push(`Payslip Runs (${payslipRunsCount})`)
    if (payslipsCount > 0) assignedModules.push(`Payslips (${payslipsCount})`)

    if (assignedModules.length > 0) {
      const message = `Cannot delete tenant: It is assigned to ${assignedModules.join(', ')}. Please remove all related data first.`
      this.logWithContext('warn', message, auditContext)
      throw new BadRequestException(message)
    }

    await this.prisma.tenant.delete({
      where: { id },
    })

    this.logWithContext(
      'log',
      `Tenant ${id} deleted successfully`,
      auditContext,
    )
  }

  /**
   * Get tenant users count
   */
  async getTenantUsersCount(tenantId: number): Promise<number> {
    return this.prisma.user.count({
      where: { tenantId },
    })
  }

  /**
   * Get tenant employees count
   */
  async getTenantEmployeesCount(tenantId: number): Promise<number> {
    return this.prisma.employee.count({
      where: { tenantId },
    })
  }

  /**
   * Helper: Build search filter for tenant
   */
  protected buildSearchFilter(query?: string): Prisma.TenantWhereInput {
    if (!query) return {}

    return {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { code: { contains: query, mode: 'insensitive' } },
      ],
    }
  }

  /**
   * Helper: Convert Prisma model to DTO
   */
  private toDto(tenant: Tenant): TenantDto {
    return {
      id: tenant.id,
      name: tenant.name,
      code: tenant.code,
      createdBy: tenant.createdBy,
      createdAt: tenant.createdAt,
      updatedBy: tenant.updatedBy,
      updatedAt: tenant.updatedAt,
    }
  }

  /**
   * Helper: Convert array of Prisma models to DTOs
   */
  private mapToDto(tenants: Tenant[]): TenantDto[] {
    return tenants.map((tenant) => this.toDto(tenant))
  }
}
