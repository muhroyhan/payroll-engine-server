import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  Payslip,
  PayslipPeriod,
  PayslipRun,
  Prisma,
} from '@prismaclient/client'

import { BaseService } from '@src/common/services'
import { PaginatedResponse, PaginationDto } from '@src/common/dto'
import type { AuditContext } from '@src/common/types'
import { AbilityFactory } from '@src/common/casl'
import { PrismaService } from '@src/database/prisma.service'
import {
  PayrollRegulationProfile,
  resolvePayrollRegulationProfile,
} from '../constants'
import {
  CreatePayslipPeriodDto,
  PayslipDto,
  PayslipListQueryDto,
  PayslipPeriodDto,
  PayslipRunDto,
  ProcessPayslipPeriodDto,
  PtkpStatus,
  UpdatePayslipPeriodDto,
} from '../dto'

@Injectable()
export class PayslipService extends BaseService<
  PayslipPeriodDto,
  CreatePayslipPeriodDto,
  UpdatePayslipPeriodDto
> {
  constructor(
    private prisma: PrismaService,
    private abilityFactory: AbilityFactory,
  ) {
    super(PayslipService.name)
  }

  async findAll(
    pagination: PaginationDto,
    auditContext: AuditContext,
  ): Promise<PaginatedResponse<PayslipPeriodDto>> {
    const normalized = this.normalizePaginationDto(pagination)
    const offset = this.calculateOffset(normalized.page, normalized.limit)

    const searchFilter = this.buildSearchFilter(normalized.search)
    const scopeFilter = this.abilityFactory.buildPayslipPeriodWhere(
      auditContext,
      'read',
    )

    const where: Prisma.PayslipPeriodWhereInput = {
      ...(scopeFilter ?? {}),
      ...(searchFilter ?? {}),
    }

    const [data, total] = await Promise.all([
      this.prisma.payslipPeriod.findMany({
        where,
        skip: offset,
        take: normalized.limit,
        orderBy: this.buildSortConfig(normalized.sortBy, normalized.sortOrder, [
          'id',
          'name',
          'period_start',
          'period_end',
          'status',
          'createdAt',
        ]),
        include: {
          tenant: {
            select: {
              name: true,
              code: true,
            },
          },
          _count: {
            select: {
              payslipRuns: true,
            },
          },
        },
      }),
      this.prisma.payslipPeriod.count({ where }),
    ])

    return new PaginatedResponse(
      data.map((item) => this.toPeriodDto(item)),
      total,
      normalized.page,
      normalized.limit,
    )
  }

  async findOne(
    id: number,
    auditContext: AuditContext,
  ): Promise<PayslipPeriodDto> {
    const scopeFilter = this.abilityFactory.buildPayslipPeriodWhere(
      auditContext,
      'read',
    )

    const period = await this.prisma.payslipPeriod.findFirst({
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
        _count: {
          select: {
            payslipRuns: true,
          },
        },
      },
    })

    if (!period) {
      throw new NotFoundException(`Payslip period with ID ${id} not found`)
    }

    return this.toPeriodDto(period)
  }

  async create(
    createDto: CreatePayslipPeriodDto,
    auditContext: AuditContext,
  ): Promise<PayslipPeriodDto> {
    const { tenantId, periodStart, periodEnd } =
      this.resolveTenantAndPeriodRange(
        createDto.tenantId,
        createDto.periodStart,
        createDto.periodEnd,
        auditContext,
      )

    await this.ensureNoPeriodOverlap(tenantId, periodStart, periodEnd)

    const created = await this.prisma.$transaction(async (tx) => {
      const createdPeriod = await tx.payslipPeriod.create({
        data: {
          tenantId,
          name: createDto.name,
          period_start: periodStart,
          period_end: periodEnd,
          status: 'draft',
          createdBy: auditContext.userFullName,
          updatedBy: auditContext.userFullName,
        },
      })

      await this.writeAuditLog(tx, {
        action: 'CREATE',
        entity: 'PayslipPeriod',
        entityId: createdPeriod.id,
        tenantId: createdPeriod.tenantId,
        auditContext,
        afterData: createdPeriod as unknown as Record<string, unknown>,
      })

      return createdPeriod
    })

    return this.findOne(created.id, auditContext)
  }

  async update(
    id: number,
    updateDto: UpdatePayslipPeriodDto,
    auditContext: AuditContext,
  ): Promise<PayslipPeriodDto> {
    const scopeFilter = this.abilityFactory.buildPayslipPeriodWhere(
      auditContext,
      'manage',
    )

    const existing = await this.prisma.payslipPeriod.findFirst({
      where: {
        id,
        ...(scopeFilter ?? {}),
      },
    })

    if (!existing) {
      throw new NotFoundException(`Payslip period with ID ${id} not found`)
    }

    if (existing.status === 'locked') {
      throw new BadRequestException('Locked payslip period cannot be updated')
    }

    const managedTenantId =
      this.abilityFactory.resolveManagedTenantId(auditContext)

    const nextTenantId =
      updateDto.tenantId === undefined ? existing.tenantId : updateDto.tenantId

    if (
      updateDto.tenantId !== undefined &&
      auditContext.role !== 'superadmin'
    ) {
      throw new BadRequestException('Only superadmin can update tenantId')
    }

    if (auditContext.role !== 'superadmin' && managedTenantId !== null) {
      if (nextTenantId !== managedTenantId) {
        throw new BadRequestException('tenantId must match your tenant context')
      }
    }

    const periodStart = updateDto.periodStart
      ? new Date(updateDto.periodStart)
      : existing.period_start
    const periodEnd = updateDto.periodEnd
      ? new Date(updateDto.periodEnd)
      : existing.period_end

    this.validatePeriodRange(periodStart, periodEnd)

    await this.ensureNoPeriodOverlap(nextTenantId, periodStart, periodEnd, id)

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedPeriod = await tx.payslipPeriod.update({
        where: { id },
        data: {
          tenantId: nextTenantId,
          name: updateDto.name ?? existing.name,
          period_start: periodStart,
          period_end: periodEnd,
          updatedBy: auditContext.userFullName,
        },
      })

      await this.writeAuditLog(tx, {
        action: 'UPDATE',
        entity: 'PayslipPeriod',
        entityId: updatedPeriod.id,
        tenantId: updatedPeriod.tenantId,
        auditContext,
        beforeData: existing as unknown as Record<string, unknown>,
        afterData: updatedPeriod as unknown as Record<string, unknown>,
      })

      return updatedPeriod
    })

    return this.findOne(updated.id, auditContext)
  }

  async delete(id: number, auditContext: AuditContext): Promise<void> {
    const scopeFilter = this.abilityFactory.buildPayslipPeriodWhere(
      auditContext,
      'manage',
    )

    const existing = await this.prisma.payslipPeriod.findFirst({
      where: {
        id,
        ...(scopeFilter ?? {}),
      },
      include: {
        _count: {
          select: {
            payslipRuns: true,
          },
        },
      },
    })

    if (!existing) {
      throw new NotFoundException(`Payslip period with ID ${id} not found`)
    }

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft payslip period can be deleted')
    }

    if (existing._count.payslipRuns > 0) {
      throw new BadRequestException(
        'Cannot delete payslip period that already has payroll runs',
      )
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payslipPeriod.delete({
        where: { id },
      })

      await this.writeAuditLog(tx, {
        action: 'DELETE',
        entity: 'PayslipPeriod',
        entityId: id,
        tenantId: existing.tenantId,
        auditContext,
        beforeData: existing as unknown as Record<string, unknown>,
      })
    })
  }

  async processPeriod(
    periodId: number,
    dto: ProcessPayslipPeriodDto,
    auditContext: AuditContext,
  ): Promise<PayslipRunDto> {
    const scopeFilter = this.abilityFactory.buildPayslipPeriodWhere(
      auditContext,
      'manage',
    )

    const period = await this.prisma.payslipPeriod.findFirst({
      where: {
        id: periodId,
        ...(scopeFilter ?? {}),
      },
      include: {
        payslipRuns: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!period) {
      throw new NotFoundException(
        `Payslip period with ID ${periodId} not found`,
      )
    }

    if (period.status !== 'draft') {
      throw new BadRequestException(
        'Only draft payslip period can be processed',
      )
    }

    if (period.payslipRuns.length > 0) {
      throw new BadRequestException('Payslip period already has payroll run')
    }

    const employeeScopeFilter = this.abilityFactory.buildEmployeeWhere(
      auditContext,
      'manage',
    )

    const requestedEmployeeIds = dto.employeeIds ?? []
    const applyStatutoryDeductions = dto.applyStatutoryDeductions ?? true
    const defaultPtkpStatus = dto.defaultPtkpStatus ?? 'TK0'
    const employeeTaxProfileMap = new Map<number, PtkpStatus>()

    if (dto.employeeTaxProfiles && dto.employeeTaxProfiles.length > 0) {
      for (const item of dto.employeeTaxProfiles) {
        if (employeeTaxProfileMap.has(item.employeeId)) {
          throw new BadRequestException(
            `Duplicate employee tax profile for employee ID ${item.employeeId}`,
          )
        }

        employeeTaxProfileMap.set(item.employeeId, item.ptkpStatus)
      }
    }

    let regulationProfile: PayrollRegulationProfile | null = null

    if (applyStatutoryDeductions) {
      try {
        regulationProfile = resolvePayrollRegulationProfile(
          dto.regulationProfileCode,
          period.period_end,
        )
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error
            ? error.message
            : 'Unable to resolve payroll regulation profile',
        )
      }
    }

    const employees = await this.prisma.employee.findMany({
      where: {
        ...(employeeScopeFilter ?? {}),
        tenantId: period.tenantId,
        isActive: true,
        ...(requestedEmployeeIds.length > 0
          ? {
              id: {
                in: requestedEmployeeIds,
              },
            }
          : {}),
      },
      include: {
        employeeSalaryComponents: {
          where: {
            isActive: true,
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    })

    if (
      requestedEmployeeIds.length > 0 &&
      employees.length !== requestedEmployeeIds.length
    ) {
      throw new BadRequestException(
        'Some employee IDs are invalid or outside your accessible scope',
      )
    }

    if (employees.length === 0) {
      throw new BadRequestException(
        'No active employee found to generate payroll for this period',
      )
    }

    const processedRun = await this.prisma.$transaction(async (tx) => {
      const initialTotal = new Prisma.Decimal(0)

      const createdRun = await tx.payslipRun.create({
        data: {
          payslipPeriodId: period.id,
          runByUserId: auditContext.userId,
          tenantId: period.tenantId,
          grossSalary: initialTotal,
          totalDeductions: initialTotal,
          netSalary: initialTotal,
          createdBy: auditContext.userFullName,
          updatedBy: auditContext.userFullName,
        },
      })

      let totalGross = new Prisma.Decimal(0)
      let totalDeduction = new Prisma.Decimal(0)
      let totalNet = new Prisma.Decimal(0)

      for (const employee of employees) {
        let totalAllowance = new Prisma.Decimal(0)
        let employeeTotalDeduction = new Prisma.Decimal(0)
        let taxableAllowance = new Prisma.Decimal(0)

        const items = employee.employeeSalaryComponents.map((component) => {
          const amount = this.calculateComponentAmount(
            employee.baseSalary,
            component.calculationType,
            component.defaultValue,
          )

          if (component.type === 'allowance') {
            totalAllowance = totalAllowance.plus(amount)

            if (component.isTaxable) {
              taxableAllowance = taxableAllowance.plus(amount)
            }
          } else {
            employeeTotalDeduction = employeeTotalDeduction.plus(amount)
          }

          return {
            componentName: component.name,
            componentType: component.type,
            amount,
            createdBy: auditContext.userFullName,
            updatedBy: auditContext.userFullName,
          }
        })

        const grossSalary = this.roundCurrency(
          employee.baseSalary.plus(totalAllowance),
        )

        if (applyStatutoryDeductions && regulationProfile) {
          const ptkpStatus =
            employeeTaxProfileMap.get(employee.id) ??
            employee.ptkpStatus ??
            defaultPtkpStatus

          const statutoryDeductions = this.calculateStatutoryDeductions({
            baseSalary: employee.baseSalary,
            grossSalary,
            taxableAllowance,
            ptkpStatus,
            hasNpwp: employee.hasNpwp,
            isBpjsKesehatanParticipant: employee.isBpjsKesehatanParticipant,
            isBpjsKetenagakerjaanParticipant:
              employee.isBpjsKetenagakerjaanParticipant,
            profile: regulationProfile,
          })

          if (statutoryDeductions.bpjsKesehatan.gt(0)) {
            items.push({
              componentName: 'BPJS Kesehatan (Employee)',
              componentType: 'deduction',
              amount: statutoryDeductions.bpjsKesehatan,
              createdBy: auditContext.userFullName,
              updatedBy: auditContext.userFullName,
            })
          }

          if (statutoryDeductions.bpjsJht.gt(0)) {
            items.push({
              componentName: 'BPJS JHT (Employee)',
              componentType: 'deduction',
              amount: statutoryDeductions.bpjsJht,
              createdBy: auditContext.userFullName,
              updatedBy: auditContext.userFullName,
            })
          }

          if (statutoryDeductions.bpjsJp.gt(0)) {
            items.push({
              componentName: 'BPJS JP (Employee)',
              componentType: 'deduction',
              amount: statutoryDeductions.bpjsJp,
              createdBy: auditContext.userFullName,
              updatedBy: auditContext.userFullName,
            })
          }

          if (statutoryDeductions.pph21.gt(0)) {
            items.push({
              componentName: `PPh21 (${regulationProfile.code})`,
              componentType: 'deduction',
              amount: statutoryDeductions.pph21,
              createdBy: auditContext.userFullName,
              updatedBy: auditContext.userFullName,
            })
          }

          employeeTotalDeduction = this.roundCurrency(
            employeeTotalDeduction.plus(statutoryDeductions.total),
          )
        }

        const netSalary = this.roundCurrency(
          grossSalary.minus(employeeTotalDeduction),
        )

        const createdPayslip = await tx.payslip.create({
          data: {
            payslipRunId: createdRun.id,
            employeeId: employee.id,
            tenantId: period.tenantId,
            baseSalary: employee.baseSalary,
            grossSalary,
            totalAllowance: this.roundCurrency(totalAllowance),
            totalDeduction: this.roundCurrency(employeeTotalDeduction),
            netSalary,
            createdBy: auditContext.userFullName,
            updatedBy: auditContext.userFullName,
            payslipItems: {
              create: items,
            },
          },
        })

        await this.writeAuditLog(tx, {
          action: 'CREATE',
          entity: 'Payslip',
          entityId: createdPayslip.id,
          tenantId: createdPayslip.tenantId,
          auditContext,
          afterData: createdPayslip as unknown as Record<string, unknown>,
        })

        totalGross = totalGross.plus(grossSalary)
        totalDeduction = totalDeduction.plus(employeeTotalDeduction)
        totalNet = totalNet.plus(netSalary)
      }

      const updatedRun = await tx.payslipRun.update({
        where: {
          id: createdRun.id,
        },
        data: {
          grossSalary: this.roundCurrency(totalGross),
          totalDeductions: this.roundCurrency(totalDeduction),
          netSalary: this.roundCurrency(totalNet),
          updatedBy: auditContext.userFullName,
        },
      })

      await tx.payslipPeriod.update({
        where: {
          id: period.id,
        },
        data: {
          status: 'processed',
          updatedBy: auditContext.userFullName,
        },
      })

      await this.writeAuditLog(tx, {
        action: 'CREATE',
        entity: 'PayslipRun',
        entityId: updatedRun.id,
        tenantId: updatedRun.tenantId,
        auditContext,
        afterData: updatedRun as unknown as Record<string, unknown>,
      })

      await this.writeAuditLog(tx, {
        action: 'UPDATE',
        entity: 'PayslipPeriod',
        entityId: period.id,
        tenantId: period.tenantId,
        auditContext,
        beforeData: period as unknown as Record<string, unknown>,
        afterData: {
          ...period,
          status: 'processed',
          updatedBy: auditContext.userFullName,
        },
      })

      return updatedRun
    })

    return this.findRunById(processedRun.id, auditContext)
  }

  async lockPeriod(
    periodId: number,
    auditContext: AuditContext,
  ): Promise<PayslipPeriodDto> {
    const scopeFilter = this.abilityFactory.buildPayslipPeriodWhere(
      auditContext,
      'manage',
    )

    const period = await this.prisma.payslipPeriod.findFirst({
      where: {
        id: periodId,
        ...(scopeFilter ?? {}),
      },
      include: {
        _count: {
          select: {
            payslipRuns: true,
          },
        },
      },
    })

    if (!period) {
      throw new NotFoundException(
        `Payslip period with ID ${periodId} not found`,
      )
    }

    if (period.status !== 'processed') {
      throw new BadRequestException(
        'Only processed payslip period can be locked',
      )
    }

    if (period._count.payslipRuns === 0) {
      throw new BadRequestException(
        'Cannot lock payslip period without payroll run',
      )
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.payslipPeriod.update({
        where: { id: periodId },
        data: {
          status: 'locked',
          updatedBy: auditContext.userFullName,
        },
      })

      await this.writeAuditLog(tx, {
        action: 'UPDATE',
        entity: 'PayslipPeriod',
        entityId: updated.id,
        tenantId: updated.tenantId,
        auditContext,
        beforeData: period as unknown as Record<string, unknown>,
        afterData: updated as unknown as Record<string, unknown>,
      })
    })

    return this.findOne(periodId, auditContext)
  }

  async findRunsByPeriod(
    periodId: number,
    pagination: PaginationDto,
    auditContext: AuditContext,
  ): Promise<PaginatedResponse<PayslipRunDto>> {
    const periodScopeFilter = this.abilityFactory.buildPayslipPeriodWhere(
      auditContext,
      'read',
    )

    const period = await this.prisma.payslipPeriod.findFirst({
      where: {
        id: periodId,
        ...(periodScopeFilter ?? {}),
      },
    })

    if (!period) {
      throw new NotFoundException(
        `Payslip period with ID ${periodId} not found`,
      )
    }

    const normalized = this.normalizePaginationDto(pagination)
    const offset = this.calculateOffset(normalized.page, normalized.limit)

    const runScopeFilter = this.abilityFactory.buildPayslipRunWhere(
      auditContext,
      'read',
    )

    const where: Prisma.PayslipRunWhereInput = {
      ...(runScopeFilter ?? {}),
      payslipPeriodId: periodId,
    }

    const [data, total] = await Promise.all([
      this.prisma.payslipRun.findMany({
        where,
        skip: offset,
        take: normalized.limit,
        orderBy: this.buildSortConfig(normalized.sortBy, normalized.sortOrder, [
          'id',
          'createdAt',
          'grossSalary',
          'totalDeductions',
          'netSalary',
        ]),
        include: {
          payslipPeriod: {
            select: {
              name: true,
            },
          },
          runByUser: {
            select: {
              fullName: true,
            },
          },
          _count: {
            select: {
              payslips: true,
            },
          },
        },
      }),
      this.prisma.payslipRun.count({ where }),
    ])

    return new PaginatedResponse(
      data.map((item) => this.toRunDto(item)),
      total,
      normalized.page,
      normalized.limit,
    )
  }

  async findPayslips(
    query: PayslipListQueryDto,
    pagination: PaginationDto,
    auditContext: AuditContext,
  ): Promise<PaginatedResponse<PayslipDto>> {
    const normalized = this.normalizePaginationDto(pagination)
    const offset = this.calculateOffset(normalized.page, normalized.limit)

    const scopeFilter = this.abilityFactory.buildPayslipWhere(
      auditContext,
      'read',
    )
    const searchFilter = this.buildPayslipSearchFilter(normalized.search)

    const where: Prisma.PayslipWhereInput = {
      ...(scopeFilter ?? {}),
      ...(searchFilter ?? {}),
      ...(query.payslipRunId !== undefined
        ? { payslipRunId: query.payslipRunId }
        : {}),
      ...(query.employeeId !== undefined
        ? { employeeId: query.employeeId }
        : {}),
      ...(query.payslipPeriodId !== undefined
        ? {
            payslipRun: {
              payslipPeriodId: query.payslipPeriodId,
            },
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      this.prisma.payslip.findMany({
        where,
        skip: offset,
        take: normalized.limit,
        orderBy: this.buildSortConfig(normalized.sortBy, normalized.sortOrder, [
          'id',
          'employeeId',
          'grossSalary',
          'totalAllowance',
          'totalDeduction',
          'netSalary',
          'createdAt',
        ]),
        include: {
          employee: {
            select: {
              employeeCode: true,
              fullName: true,
            },
          },
          payslipRun: {
            select: {
              payslipPeriodId: true,
              payslipPeriod: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.payslip.count({ where }),
    ])

    return new PaginatedResponse(
      data.map((item) => this.toPayslipDto(item)),
      total,
      normalized.page,
      normalized.limit,
    )
  }

  async findPayslipById(
    id: number,
    auditContext: AuditContext,
  ): Promise<PayslipDto> {
    const scopeFilter = this.abilityFactory.buildPayslipWhere(
      auditContext,
      'read',
    )

    const payslip = await this.prisma.payslip.findFirst({
      where: {
        id,
        ...(scopeFilter ?? {}),
      },
      include: {
        employee: {
          select: {
            employeeCode: true,
            fullName: true,
          },
        },
        payslipRun: {
          select: {
            payslipPeriodId: true,
            payslipPeriod: {
              select: {
                name: true,
              },
            },
          },
        },
        payslipItems: {
          orderBy: {
            id: 'asc',
          },
        },
      },
    })

    if (!payslip) {
      throw new NotFoundException(`Payslip with ID ${id} not found`)
    }

    return this.toPayslipDto(payslip)
  }

  protected buildSearchFilter(query?: string): Prisma.PayslipPeriodWhereInput {
    if (!query) return {}

    return {
      OR: [{ name: { contains: query, mode: 'insensitive' } }],
    }
  }

  private buildPayslipSearchFilter(query?: string): Prisma.PayslipWhereInput {
    if (!query) return {}

    return {
      OR: [
        {
          employee: {
            employeeCode: {
              contains: query,
              mode: 'insensitive',
            },
          },
        },
        {
          employee: {
            fullName: {
              contains: query,
              mode: 'insensitive',
            },
          },
        },
        {
          payslipRun: {
            payslipPeriod: {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
          },
        },
      ],
    }
  }

  private calculateComponentAmount(
    baseSalary: Prisma.Decimal,
    calculationType: 'fixed' | 'percentage',
    defaultValue: Prisma.Decimal,
  ): Prisma.Decimal {
    if (calculationType === 'percentage') {
      return this.roundCurrency(baseSalary.mul(defaultValue).div(100))
    }

    return this.roundCurrency(defaultValue)
  }

  private calculateStatutoryDeductions(input: {
    baseSalary: Prisma.Decimal
    grossSalary: Prisma.Decimal
    taxableAllowance: Prisma.Decimal
    ptkpStatus: PtkpStatus
    hasNpwp: boolean
    isBpjsKesehatanParticipant: boolean
    isBpjsKetenagakerjaanParticipant: boolean
    profile: PayrollRegulationProfile
  }): {
    bpjsKesehatan: Prisma.Decimal
    bpjsJht: Prisma.Decimal
    bpjsJp: Prisma.Decimal
    pph21: Prisma.Decimal
    total: Prisma.Decimal
  } {
    const bpjsKesehatanBase = Prisma.Decimal.min(
      input.grossSalary,
      input.profile.bpjs.kesehatanWageCap,
    )
    const bpjsKesehatan = input.isBpjsKesehatanParticipant
      ? this.roundCurrency(
          bpjsKesehatanBase.mul(input.profile.bpjs.kesehatanEmployeeRate),
        )
      : new Prisma.Decimal(0)

    const bpjsJht = input.isBpjsKetenagakerjaanParticipant
      ? this.roundCurrency(
          input.baseSalary.mul(input.profile.bpjs.jhtEmployeeRate),
        )
      : new Prisma.Decimal(0)

    const bpjsJpBase = Prisma.Decimal.min(
      input.baseSalary,
      input.profile.bpjs.jpWageCap,
    )
    const bpjsJp = input.isBpjsKetenagakerjaanParticipant
      ? this.roundCurrency(bpjsJpBase.mul(input.profile.bpjs.jpEmployeeRate))
      : new Prisma.Decimal(0)

    const taxableGrossMonthly = this.roundCurrency(
      input.baseSalary.plus(input.taxableAllowance),
    )

    const monthlyOccupationalCost = Prisma.Decimal.min(
      this.roundCurrency(
        taxableGrossMonthly.mul(input.profile.pph21.occupationalCostRate),
      ),
      input.profile.pph21.occupationalCostMonthlyCap,
    )

    const monthlyNetoForTax = this.roundCurrency(
      taxableGrossMonthly
        .minus(monthlyOccupationalCost)
        .minus(bpjsJht)
        .minus(bpjsJp),
    )

    const annualNetoForTax = this.roundCurrency(monthlyNetoForTax.mul(12))
    const ptkp = input.profile.pph21.ptkpByStatus[input.ptkpStatus]
    const annualPkpRaw = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      annualNetoForTax.minus(ptkp),
    )

    const annualPkpRounded = annualPkpRaw.div(1000).floor().mul(1000)

    let annualTax = this.calculateProgressiveAnnualTax(
      annualPkpRounded,
      input.profile,
    )

    if (!input.hasNpwp) {
      annualTax = this.roundCurrency(
        annualTax.mul(input.profile.pph21.nonNpwpRateMultiplier),
      )
    }
    const pph21 = this.roundCurrency(annualTax.div(12))

    const total = this.roundCurrency(
      bpjsKesehatan.plus(bpjsJht).plus(bpjsJp).plus(pph21),
    )

    return {
      bpjsKesehatan,
      bpjsJht,
      bpjsJp,
      pph21,
      total,
    }
  }

  private calculateProgressiveAnnualTax(
    annualPkp: Prisma.Decimal,
    profile: PayrollRegulationProfile,
  ): Prisma.Decimal {
    let remaining = annualPkp
    let lowerBound = new Prisma.Decimal(0)
    let total = new Prisma.Decimal(0)

    if (remaining.lte(0)) {
      return total
    }

    for (const bracket of profile.pph21.annualBrackets) {
      if (remaining.lte(0)) {
        break
      }

      if (bracket.upTo === null) {
        total = total.plus(remaining.mul(bracket.rate))
        remaining = new Prisma.Decimal(0)
        break
      }

      const bracketWidth = bracket.upTo.minus(lowerBound)
      const taxableInBracket = Prisma.Decimal.min(remaining, bracketWidth)

      total = total.plus(taxableInBracket.mul(bracket.rate))
      remaining = remaining.minus(taxableInBracket)
      lowerBound = bracket.upTo
    }

    return this.roundCurrency(total)
  }

  private roundCurrency(value: Prisma.Decimal): Prisma.Decimal {
    return new Prisma.Decimal(
      value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toString(),
    )
  }

  private resolveTenantAndPeriodRange(
    inputTenantId: number | undefined,
    periodStartInput: string,
    periodEndInput: string,
    auditContext: AuditContext,
  ): {
    tenantId: number
    periodStart: Date
    periodEnd: Date
  } {
    const managedTenantId =
      this.abilityFactory.resolveManagedTenantId(auditContext)

    let tenantId: number

    if (auditContext.role === 'superadmin') {
      if (inputTenantId === undefined) {
        throw new BadRequestException('tenantId is required for superadmin')
      }

      tenantId = inputTenantId
    } else {
      if (managedTenantId === null) {
        throw new BadRequestException('Unable to resolve tenant scope')
      }

      if (inputTenantId !== undefined && inputTenantId !== managedTenantId) {
        throw new BadRequestException('tenantId must match your tenant context')
      }

      tenantId = managedTenantId
    }

    const periodStart = new Date(periodStartInput)
    const periodEnd = new Date(periodEndInput)

    this.validatePeriodRange(periodStart, periodEnd)

    return {
      tenantId,
      periodStart,
      periodEnd,
    }
  }

  private validatePeriodRange(periodStart: Date, periodEnd: Date): void {
    if (
      Number.isNaN(periodStart.getTime()) ||
      Number.isNaN(periodEnd.getTime())
    ) {
      throw new BadRequestException('Invalid period_start or period_end date')
    }

    if (periodEnd < periodStart) {
      throw new BadRequestException(
        'periodEnd must be after or equal to periodStart',
      )
    }
  }

  private async ensureNoPeriodOverlap(
    tenantId: number,
    periodStart: Date,
    periodEnd: Date,
    excludeId?: number,
  ): Promise<void> {
    const overlap = await this.prisma.payslipPeriod.findFirst({
      where: {
        tenantId,
        ...(excludeId !== undefined
          ? {
              NOT: {
                id: excludeId,
              },
            }
          : {}),
        period_start: {
          lte: periodEnd,
        },
        period_end: {
          gte: periodStart,
        },
      },
      select: {
        id: true,
      },
    })

    if (overlap) {
      throw new BadRequestException(
        `Period overlaps with existing payslip period ID ${overlap.id}`,
      )
    }
  }

  private async findRunById(
    id: number,
    auditContext: AuditContext,
  ): Promise<PayslipRunDto> {
    const scopeFilter = this.abilityFactory.buildPayslipRunWhere(
      auditContext,
      'read',
    )

    const run = await this.prisma.payslipRun.findFirst({
      where: {
        id,
        ...(scopeFilter ?? {}),
      },
      include: {
        payslipPeriod: {
          select: {
            name: true,
          },
        },
        runByUser: {
          select: {
            fullName: true,
          },
        },
        _count: {
          select: {
            payslips: true,
          },
        },
      },
    })

    if (!run) {
      throw new NotFoundException(`Payslip run with ID ${id} not found`)
    }

    return this.toRunDto(run)
  }

  private toPeriodDto(
    period: PayslipPeriod & {
      tenant?: { name: string; code: string } | null
      _count?: { payslipRuns: number }
    },
  ): PayslipPeriodDto {
    return {
      id: period.id,
      tenantId: period.tenantId,
      tenantName: period.tenant?.name,
      tenantCode: period.tenant?.code,
      name: period.name,
      periodStart: period.period_start,
      periodEnd: period.period_end,
      status: period.status,
      runCount: period._count?.payslipRuns ?? 0,
      createdBy: period.createdBy,
      createdAt: period.createdAt,
      updatedBy: period.updatedBy,
      updatedAt: period.updatedAt,
    }
  }

  private toRunDto(
    run: PayslipRun & {
      payslipPeriod?: { name: string } | null
      runByUser?: { fullName: string } | null
      _count?: { payslips: number }
    },
  ): PayslipRunDto {
    return {
      id: run.id,
      payslipPeriodId: run.payslipPeriodId,
      payslipPeriodName: run.payslipPeriod?.name,
      tenantId: run.tenantId,
      runByUserId: run.runByUserId,
      runByUserName: run.runByUser?.fullName,
      grossSalary: run.grossSalary.toString(),
      totalDeductions: run.totalDeductions.toString(),
      netSalary: run.netSalary.toString(),
      payslipCount: run._count?.payslips ?? 0,
      createdBy: run.createdBy,
      createdAt: run.createdAt,
      updatedBy: run.updatedBy,
      updatedAt: run.updatedAt,
    }
  }

  private toPayslipDto(
    payslip: Payslip & {
      employee?: { employeeCode: string; fullName: string } | null
      payslipRun?: {
        payslipPeriodId: number
        payslipPeriod?: { name: string } | null
      } | null
      payslipItems?: Array<{
        id: number
        componentName: string
        componentType: 'allowance' | 'deduction'
        amount: Prisma.Decimal
      }>
    },
  ): PayslipDto {
    return {
      id: payslip.id,
      payslipRunId: payslip.payslipRunId,
      payslipPeriodId: payslip.payslipRun?.payslipPeriodId,
      payslipPeriodName: payslip.payslipRun?.payslipPeriod?.name,
      tenantId: payslip.tenantId,
      employeeId: payslip.employeeId,
      employeeCode: payslip.employee?.employeeCode,
      employeeName: payslip.employee?.fullName,
      baseSalary: payslip.baseSalary.toString(),
      grossSalary: payslip.grossSalary.toString(),
      totalAllowance: payslip.totalAllowance.toString(),
      totalDeduction: payslip.totalDeduction.toString(),
      netSalary: payslip.netSalary.toString(),
      createdBy: payslip.createdBy,
      createdAt: payslip.createdAt,
      updatedBy: payslip.updatedBy,
      updatedAt: payslip.updatedAt,
      payslipItems: payslip.payslipItems?.map((item) => ({
        id: item.id,
        componentName: item.componentName,
        componentType: item.componentType,
        amount: item.amount.toString(),
      })),
    }
  }
}
