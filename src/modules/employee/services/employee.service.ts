import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Employee, Prisma } from '@prismaclient/client'

import { BaseService } from '@src/common/services'
import { PaginatedResponse, PaginationDto } from '@src/common/dto'
import type { AuditContext } from '@src/common/types'
import { AbilityFactory } from '@src/common/casl'
import { PrismaService } from '@src/database/prisma.service'
import { CreateEmployeeDto, EmployeeDto, UpdateEmployeeDto } from '../dto'

@Injectable()
export class EmployeeService extends BaseService<
  EmployeeDto,
  CreateEmployeeDto,
  UpdateEmployeeDto
> {
  constructor(
    private prisma: PrismaService,
    private abilityFactory: AbilityFactory,
  ) {
    super(EmployeeService.name)
  }

  async findAll(
    pagination: PaginationDto,
    auditContext: AuditContext,
  ): Promise<PaginatedResponse<EmployeeDto>> {
    this.logWithContext('log', 'Fetching employees', auditContext)

    const normalized = this.normalizePaginationDto(pagination)
    const offset = this.calculateOffset(normalized.page, normalized.limit)

    const searchFilter = this.buildSearchFilter(normalized.search)
    const scopeFilter = this.abilityFactory.buildEmployeeWhere(
      auditContext,
      'read',
    )

    const where: Prisma.EmployeeWhereInput = {
      ...(scopeFilter ?? {}),
      ...(searchFilter ?? {}),
    }

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip: offset,
        take: normalized.limit,
        orderBy: this.buildSortConfig(normalized.sortBy, normalized.sortOrder, [
          'id',
          'employeeCode',
          'fullName',
          'position',
          'employeeType',
          'baseSalary',
          'joinDate',
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
      this.prisma.employee.count({ where }),
    ])

    return new PaginatedResponse(
      this.mapToDto(data),
      total,
      normalized.page,
      normalized.limit,
    )
  }

  async findOne(id: number, auditContext: AuditContext): Promise<EmployeeDto> {
    this.logWithContext('log', `Fetching employee ${id}`, auditContext)

    const scopeFilter = this.abilityFactory.buildEmployeeWhere(
      auditContext,
      'read',
    )

    const employee = await this.prisma.employee.findFirst({
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

    if (!employee) {
      this.logWithContext('warn', `Employee ${id} not found`, auditContext)
      throw new NotFoundException(`Employee with ID ${id} not found`)
    }

    return this.toDto(employee)
  }

  async create(
    createDto: CreateEmployeeDto,
    auditContext: AuditContext,
  ): Promise<EmployeeDto> {
    let sequence = (await this.prisma.employee.count()) + 1
    let generatedCode = `EMP-${String(sequence).padStart(6, '0')}`

    while (
      await this.prisma.employee.findUnique({
        where: { employeeCode: generatedCode },
      })
    ) {
      sequence += 1
      generatedCode = `EMP-${String(sequence).padStart(6, '0')}`
    }

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

    const employee = await this.prisma.$transaction(async (tx) => {
      const createdEmployee = await tx.employee.create({
        data: {
          tenantId,
          employeeCode: generatedCode,
          fullName: createDto.fullName,
          position: createDto.position,
          employeeType: createDto.employeeType ?? 'contract',
          baseSalary: createDto.baseSalary,
          joinDate: createDto.joinDate,
          isActive: createDto.isActive ?? true,
          createdBy: auditContext.userFullName,
          updatedBy: auditContext.userFullName,
        },
      })

      await this.writeAuditLog(tx, {
        action: 'CREATE',
        entity: 'Employee',
        entityId: createdEmployee.id,
        tenantId: createdEmployee.tenantId,
        auditContext,
        afterData: createdEmployee as unknown as Record<string, unknown>,
      })

      return createdEmployee
    })

    return this.toDto(employee)
  }

  async update(
    id: number,
    updateDto: UpdateEmployeeDto,
    auditContext: AuditContext,
  ): Promise<EmployeeDto> {
    this.logWithContext('log', `Updating employee ${id}`, auditContext)

    const scopeFilter = this.abilityFactory.buildEmployeeWhere(
      auditContext,
      'manage',
    )

    const existing = await this.prisma.employee.findFirst({
      where: {
        id,
        ...(scopeFilter ?? {}),
      },
    })

    if (!existing) {
      throw new NotFoundException(`Employee with ID ${id} not found`)
    }

    const data: Prisma.EmployeeUncheckedUpdateInput = {
      updatedBy: auditContext.userFullName,
    }

    if (updateDto.fullName !== undefined) data.fullName = updateDto.fullName
    if (updateDto.position !== undefined) data.position = updateDto.position
    if (updateDto.employeeType !== undefined)
      data.employeeType = updateDto.employeeType
    if (updateDto.baseSalary !== undefined)
      data.baseSalary = updateDto.baseSalary
    if (updateDto.joinDate !== undefined) data.joinDate = updateDto.joinDate
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
      const updatedEmployee = await tx.employee.update({
        where: { id },
        data,
      })

      await this.writeAuditLog(tx, {
        action: 'UPDATE',
        entity: 'Employee',
        entityId: id,
        tenantId: updatedEmployee.tenantId,
        auditContext,
        beforeData: existing as unknown as Record<string, unknown>,
        afterData: updatedEmployee as unknown as Record<string, unknown>,
      })

      return updatedEmployee
    })

    return this.toDto(updated)
  }

  async delete(id: number, auditContext: AuditContext): Promise<void> {
    this.logWithContext('log', `Deleting employee ${id}`, auditContext)

    const scopeFilter = this.abilityFactory.buildEmployeeWhere(
      auditContext,
      'manage',
    )

    const existing = await this.prisma.employee.findFirst({
      where: {
        id,
        ...(scopeFilter ?? {}),
      },
    })

    if (!existing) {
      throw new NotFoundException(`Employee with ID ${id} not found`)
    }

    const [salaryComponentCount, payslipCount] = await Promise.all([
      this.prisma.employeeSalaryComponent.count({ where: { employeeId: id } }),
      this.prisma.payslip.count({ where: { employeeId: id } }),
    ])

    const assignedModules: string[] = []
    if (salaryComponentCount > 0)
      assignedModules.push(
        `Employee Salary Components (${salaryComponentCount})`,
      )
    if (payslipCount > 0) assignedModules.push(`Payslips (${payslipCount})`)

    if (assignedModules.length > 0) {
      const message = `Cannot delete employee: It is assigned to ${assignedModules.join(', ')}. Please remove all related data first.`
      this.logWithContext('warn', message, auditContext)
      throw new BadRequestException(message)
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.employee.delete({
        where: { id },
      })

      await this.writeAuditLog(tx, {
        action: 'DELETE',
        entity: 'Employee',
        entityId: id,
        tenantId: existing.tenantId,
        auditContext,
        beforeData: existing as unknown as Record<string, unknown>,
      })
    })
  }

  protected buildSearchFilter(query?: string): Prisma.EmployeeWhereInput {
    if (!query) return {}

    return {
      OR: [
        { employeeCode: { contains: query, mode: 'insensitive' } },
        { fullName: { contains: query, mode: 'insensitive' } },
        { position: { contains: query, mode: 'insensitive' } },
      ],
    }
  }

  private toDto(
    employee: Employee & { tenant?: { name: string; code: string } | null },
  ): EmployeeDto {
    return {
      id: employee.id,
      tenantId: employee.tenantId,
      tenantName: employee.tenant?.name,
      tenantCode: employee.tenant?.code,
      employeeCode: employee.employeeCode,
      fullName: employee.fullName,
      position: employee.position,
      employeeType: employee.employeeType,
      baseSalary: employee.baseSalary.toString(),
      joinDate: employee.joinDate,
      isActive: employee.isActive,
      createdBy: employee.createdBy,
      createdAt: employee.createdAt,
      updatedBy: employee.updatedBy,
      updatedAt: employee.updatedAt,
    }
  }

  private mapToDto(
    employees: Array<
      Employee & { tenant?: { name: string; code: string } | null }
    >,
  ): EmployeeDto[] {
    return employees.map((employee) => this.toDto(employee))
  }
}
