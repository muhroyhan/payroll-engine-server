import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Employee, EmployeeSalaryComponent, Prisma } from '@prismaclient/client'

import { BaseService } from '@src/common/services'
import { PaginatedResponse, PaginationDto } from '@src/common/dto'
import type { AuditContext } from '@src/common/types'
import { AbilityFactory } from '@src/common/casl'
import { PrismaService } from '@src/database/prisma.service'
import {
  CreateEmployeeDto,
  DeleteEmployeeDto,
  EmployeeDto,
  EmployeeSalaryComponentCreateInputDto,
  EmployeeSalaryComponentOptionDto,
  EmployeeSalaryComponentSyncInputDto,
  UpdateEmployeeDto,
} from '../dto'

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
          employeeSalaryComponents: true,
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
        employeeSalaryComponents: true,
      },
    })

    if (!employee) {
      this.logWithContext('warn', `Employee ${id} not found`, auditContext)
      throw new NotFoundException(`Employee with ID ${id} not found`)
    }

    return this.toDto(employee)
  }

  async findSalaryComponentOptions(
    search: string | undefined,
    includeInactive: boolean,
    auditContext: AuditContext,
  ): Promise<EmployeeSalaryComponentOptionDto[]> {
    const scopeFilter = this.abilityFactory.buildSalaryComponentWhere(
      auditContext,
      'read',
    )

    const where: Prisma.SalaryComponentWhereInput = {
      ...(scopeFilter ?? {}),
      ...(includeInactive ? {} : { isActive: true }),
      ...(search
        ? {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : {}),
    }

    const options = await this.prisma.salaryComponent.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        type: true,
        calculationType: true,
        defaultValue: true,
        isTaxable: true,
        isActive: true,
      },
    })

    return options.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      calculationType: item.calculationType,
      defaultValue: item.defaultValue.toString(),
      isTaxable: item.isTaxable,
      isActive: item.isActive,
    }))
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

      if (
        createDto.employeeSalaryComponents &&
        createDto.employeeSalaryComponents.length > 0
      ) {
        const createdSalaryComponents = await Promise.all(
          createDto.employeeSalaryComponents.map((item) =>
            tx.employeeSalaryComponent.create({
              data: this.mapCreateSalaryComponentInput(
                item,
                createdEmployee.id,
                createdEmployee.tenantId,
                auditContext,
              ),
            }),
          ),
        )

        for (const salaryComponent of createdSalaryComponents) {
          await this.writeAuditLog(tx, {
            action: 'CREATE',
            entity: 'EmployeeSalaryComponent',
            entityId: salaryComponent.id,
            tenantId: salaryComponent.tenantId,
            auditContext,
            afterData: salaryComponent as unknown as Record<string, unknown>,
          })
        }
      }

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

    const salaryComponentsInput =
      updateDto.employeeSalaryComponents ?? updateDto.employeeSalaryCompoennt

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedEmployee = await tx.employee.update({
        where: { id },
        data,
      })

      if (salaryComponentsInput) {
        await this.applySalaryComponentSync(
          tx,
          id,
          updatedEmployee.tenantId,
          salaryComponentsInput,
          auditContext,
        )
      }

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

  async delete(
    id: number,
    auditContext: AuditContext,
    deleteDto?: DeleteEmployeeDto,
  ): Promise<void> {
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

    const [salaryComponents, payslipCount] = await Promise.all([
      this.prisma.employeeSalaryComponent.findMany({
        where: { employeeId: id },
      }),
      this.prisma.payslip.count({ where: { employeeId: id } }),
    ])

    const salaryComponentIds = new Set(salaryComponents.map((item) => item.id))
    const requestedDeleteIds = deleteDto?.deleteSalaryComponentIds ?? []
    const deleteAllSalaryComponents =
      deleteDto?.deleteAllSalaryComponents === true

    if (
      requestedDeleteIds.some(
        (salaryComponentId) => !salaryComponentIds.has(salaryComponentId),
      )
    ) {
      throw new BadRequestException(
        'Some salary component IDs are invalid for this employee',
      )
    }

    const remainingSalaryComponentCount = deleteAllSalaryComponents
      ? 0
      : salaryComponents.length - requestedDeleteIds.length

    const assignedModules: string[] = []
    if (remainingSalaryComponentCount > 0)
      assignedModules.push(
        `Employee Salary Components (${remainingSalaryComponentCount})`,
      )
    if (payslipCount > 0) assignedModules.push(`Payslips (${payslipCount})`)

    if (assignedModules.length > 0) {
      const message = `Cannot delete employee: It is assigned to ${assignedModules.join(', ')}. Please remove all related data first.`
      this.logWithContext('warn', message, auditContext)
      throw new BadRequestException(message)
    }

    await this.prisma.$transaction(async (tx) => {
      if (deleteAllSalaryComponents) {
        for (const salaryComponent of salaryComponents) {
          await tx.employeeSalaryComponent.delete({
            where: { id: salaryComponent.id },
          })

          await this.writeAuditLog(tx, {
            action: 'DELETE',
            entity: 'EmployeeSalaryComponent',
            entityId: salaryComponent.id,
            tenantId: salaryComponent.tenantId,
            auditContext,
            beforeData: salaryComponent as unknown as Record<string, unknown>,
          })
        }
      } else if (requestedDeleteIds.length > 0) {
        const salaryComponentToDelete = salaryComponents.filter((item) =>
          requestedDeleteIds.includes(item.id),
        )

        for (const salaryComponent of salaryComponentToDelete) {
          await tx.employeeSalaryComponent.delete({
            where: { id: salaryComponent.id },
          })

          await this.writeAuditLog(tx, {
            action: 'DELETE',
            entity: 'EmployeeSalaryComponent',
            entityId: salaryComponent.id,
            tenantId: salaryComponent.tenantId,
            auditContext,
            beforeData: salaryComponent as unknown as Record<string, unknown>,
          })
        }
      }

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
    employee: Employee & {
      tenant?: { name: string; code: string } | null
      employeeSalaryComponents?: EmployeeSalaryComponent[]
    },
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
      employeeSalaryComponents: employee.employeeSalaryComponents?.map(
        (item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          calculationType: item.calculationType,
          defaultValue: item.defaultValue.toString(),
          isTaxable: item.isTaxable,
          isActive: item.isActive,
        }),
      ),
    }
  }

  private mapToDto(
    employees: Array<
      Employee & {
        tenant?: { name: string; code: string } | null
        employeeSalaryComponents?: EmployeeSalaryComponent[]
      }
    >,
  ): EmployeeDto[] {
    return employees.map((employee) => this.toDto(employee))
  }

  private mapCreateSalaryComponentInput(
    input: EmployeeSalaryComponentCreateInputDto,
    employeeId: number,
    tenantId: number,
    auditContext: AuditContext,
  ): Prisma.EmployeeSalaryComponentUncheckedCreateInput {
    return {
      employeeId,
      tenantId,
      name: input.name,
      type: input.type ?? 'allowance',
      calculationType: input.calculationType ?? 'fixed',
      defaultValue: input.defaultValue,
      isTaxable: input.isTaxable ?? false,
      isActive: input.isActive ?? true,
      createdBy: auditContext.userFullName,
      updatedBy: auditContext.userFullName,
    }
  }

  private async applySalaryComponentSync(
    tx: Prisma.TransactionClient,
    employeeId: number,
    tenantId: number,
    inputs: EmployeeSalaryComponentSyncInputDto[],
    auditContext: AuditContext,
  ): Promise<void> {
    const existingItems = await tx.employeeSalaryComponent.findMany({
      where: {
        employeeId,
        tenantId,
      },
    })

    const existingById = new Map(existingItems.map((item) => [item.id, item]))
    const retainedIds = new Set<number>()

    for (const item of inputs) {
      if (item.id !== undefined) {
        const existingItem = existingById.get(item.id)

        if (!existingItem) {
          throw new BadRequestException(
            `Salary component with ID ${item.id} is invalid for this employee`,
          )
        }

        retainedIds.add(item.id)

        const updateData: Prisma.EmployeeSalaryComponentUncheckedUpdateInput = {
          updatedBy: auditContext.userFullName,
        }

        this.mapUpdateSalaryComponentInput(updateData, item)

        const updatedItem = await tx.employeeSalaryComponent.update({
          where: { id: item.id },
          data: updateData,
        })

        await this.writeAuditLog(tx, {
          action: 'UPDATE',
          entity: 'EmployeeSalaryComponent',
          entityId: updatedItem.id,
          tenantId: updatedItem.tenantId,
          auditContext,
          beforeData: existingItem as unknown as Record<string, unknown>,
          afterData: updatedItem as unknown as Record<string, unknown>,
        })

        continue
      }

      if (item.name === undefined || item.defaultValue === undefined) {
        throw new BadRequestException(
          'name and defaultValue are required when creating employee salary components',
        )
      }

      const createdItem = await tx.employeeSalaryComponent.create({
        data: this.mapCreateSalaryComponentInput(
          {
            name: item.name,
            type: item.type,
            calculationType: item.calculationType,
            defaultValue: item.defaultValue,
            isTaxable: item.isTaxable,
            isActive: item.isActive,
          },
          employeeId,
          tenantId,
          auditContext,
        ),
      })

      retainedIds.add(createdItem.id)

      await this.writeAuditLog(tx, {
        action: 'CREATE',
        entity: 'EmployeeSalaryComponent',
        entityId: createdItem.id,
        tenantId: createdItem.tenantId,
        auditContext,
        afterData: createdItem as unknown as Record<string, unknown>,
      })
    }

    const deleteItems = existingItems.filter(
      (item) => !retainedIds.has(item.id),
    )

    for (const deleteItem of deleteItems) {
      await tx.employeeSalaryComponent.delete({
        where: { id: deleteItem.id },
      })

      await this.writeAuditLog(tx, {
        action: 'DELETE',
        entity: 'EmployeeSalaryComponent',
        entityId: deleteItem.id,
        tenantId: deleteItem.tenantId,
        auditContext,
        beforeData: deleteItem as unknown as Record<string, unknown>,
      })
    }
  }

  private mapUpdateSalaryComponentInput(
    target: Prisma.EmployeeSalaryComponentUncheckedUpdateInput,
    source: EmployeeSalaryComponentSyncInputDto,
  ): void {
    if (source.name !== undefined) target.name = source.name
    if (source.type !== undefined) target.type = source.type
    if (source.calculationType !== undefined)
      target.calculationType = source.calculationType
    if (source.defaultValue !== undefined)
      target.defaultValue = source.defaultValue
    if (source.isTaxable !== undefined) target.isTaxable = source.isTaxable
    if (source.isActive !== undefined) target.isActive = source.isActive
  }
}
