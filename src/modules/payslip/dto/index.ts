import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator'

const PAYSLIP_PERIOD_STATUSES = ['draft', 'processed', 'locked'] as const
const SALARY_TYPES = ['allowance', 'deduction'] as const
const PTKP_STATUSES = [
  'TK0',
  'TK1',
  'TK2',
  'TK3',
  'K0',
  'K1',
  'K2',
  'K3',
] as const

export type PayslipPeriodStatus = (typeof PAYSLIP_PERIOD_STATUSES)[number]
export type SalaryType = (typeof SALARY_TYPES)[number]
export type PtkpStatus = (typeof PTKP_STATUSES)[number]

export class EmployeeTaxProfileInputDto {
  @ApiProperty({
    description: 'Employee ID that gets custom PTKP status',
    example: 10,
  })
  @Type(() => Number)
  @IsNumber()
  employeeId!: number

  @ApiProperty({
    description: 'Employee PTKP status used for PPh21 annualized calculation',
    enum: PTKP_STATUSES,
    example: 'K0',
  })
  @IsIn(PTKP_STATUSES)
  ptkpStatus!: PtkpStatus
}

export class CreatePayslipPeriodDto {
  @ApiProperty({
    description: 'Display name of payslip period',
    example: 'March 2026 Payroll',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @Length(3, 255)
  name!: string

  @ApiProperty({
    description: 'Inclusive period start date',
    example: '2026-03-01T00:00:00.000Z',
  })
  @IsDateString()
  periodStart!: string

  @ApiProperty({
    description: 'Inclusive period end date',
    example: '2026-03-31T23:59:59.999Z',
  })
  @IsDateString()
  periodEnd!: string

  @ApiPropertyOptional({
    description:
      'Tenant ID to assign period to (optional for superadmin; required for non-superadmin by scope)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tenantId?: number
}

export class UpdatePayslipPeriodDto {
  @ApiPropertyOptional({
    description: 'Display name of payslip period',
    example: 'March 2026 Payroll Revision',
    minLength: 3,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(3, 255)
  name?: string

  @ApiPropertyOptional({
    description: 'Inclusive period start date',
    example: '2026-03-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  periodStart?: string

  @ApiPropertyOptional({
    description: 'Inclusive period end date',
    example: '2026-03-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  periodEnd?: string

  @ApiPropertyOptional({
    description: 'Tenant ID for reassignment (superadmin only)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tenantId?: number
}

export class ProcessPayslipPeriodDto {
  @ApiPropertyOptional({
    description:
      'Optional subset of employee IDs to process. If omitted, all active employees in tenant are processed.',
    type: [Number],
    example: [1, 3, 5],
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  employeeIds?: number[]

  @ApiPropertyOptional({
    description:
      'Apply statutory deductions (BPJS + PPh21) using effective-dated payroll regulation profile',
    example: true,
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  applyStatutoryDeductions?: boolean

  @ApiPropertyOptional({
    description:
      'Regulation profile code used for statutory calculations. Default is IDN_2026_BASE.',
    example: 'IDN_2026_BASE',
  })
  @IsOptional()
  @IsString()
  regulationProfileCode?: string

  @ApiPropertyOptional({
    description:
      'Default PTKP status applied when employee-specific profile is not provided',
    enum: PTKP_STATUSES,
    example: 'TK0',
    default: 'TK0',
  })
  @IsOptional()
  @IsIn(PTKP_STATUSES)
  defaultPtkpStatus?: PtkpStatus

  @ApiPropertyOptional({
    description:
      'Optional per-employee PTKP status override for annualized PPh21 calculation',
    type: [EmployeeTaxProfileInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeeTaxProfileInputDto)
  employeeTaxProfiles?: EmployeeTaxProfileInputDto[]
}

export class PayslipListQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by payslip run ID',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  payslipRunId?: number

  @ApiPropertyOptional({
    description: 'Filter by payslip period ID',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  payslipPeriodId?: number

  @ApiPropertyOptional({
    description: 'Filter by employee ID',
    example: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  employeeId?: number
}

export class PayslipPeriodDto {
  @ApiProperty({
    description: 'Payslip period ID',
    example: 1,
  })
  id!: number

  @ApiProperty({
    description: 'Tenant ID',
    example: 1,
  })
  tenantId!: number

  @ApiPropertyOptional({
    description: 'Tenant name',
    example: 'Acme Corporation',
  })
  tenantName?: string

  @ApiPropertyOptional({
    description: 'Tenant code',
    example: 'ACME',
  })
  tenantCode?: string

  @ApiProperty({
    description: 'Display name of payslip period',
    example: 'March 2026 Payroll',
  })
  name!: string

  @ApiProperty({
    description: 'Inclusive period start date',
    example: '2026-03-01T00:00:00.000Z',
  })
  periodStart!: Date

  @ApiProperty({
    description: 'Inclusive period end date',
    example: '2026-03-31T23:59:59.999Z',
  })
  periodEnd!: Date

  @ApiProperty({
    description: 'Period status',
    enum: PAYSLIP_PERIOD_STATUSES,
    example: 'draft',
  })
  status!: PayslipPeriodStatus

  @ApiProperty({
    description: 'Number of payroll runs in this period',
    example: 1,
  })
  runCount!: number

  @ApiProperty({
    description: 'Creator user full name',
    example: 'Admin User',
  })
  createdBy!: string

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-03-01T08:00:00.000Z',
  })
  createdAt!: Date

  @ApiProperty({
    description: 'Last updater user full name',
    example: 'Admin User',
  })
  updatedBy!: string

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-03-01T08:00:00.000Z',
  })
  updatedAt!: Date
}

export class PayslipRunDto {
  @ApiProperty({
    description: 'Payslip run ID',
    example: 1,
  })
  id!: number

  @ApiProperty({
    description: 'Payslip period ID',
    example: 1,
  })
  payslipPeriodId!: number

  @ApiPropertyOptional({
    description: 'Payslip period name',
    example: 'March 2026 Payroll',
  })
  payslipPeriodName?: string

  @ApiProperty({
    description: 'Tenant ID',
    example: 1,
  })
  tenantId!: number

  @ApiProperty({
    description: 'User ID that executed the run',
    example: 2,
  })
  runByUserId!: number

  @ApiPropertyOptional({
    description: 'User full name that executed the run',
    example: 'Payroll Officer',
  })
  runByUserName?: string

  @ApiProperty({
    description: 'Total gross salary for this run',
    example: '120000000.00',
  })
  grossSalary!: string

  @ApiProperty({
    description: 'Total deductions for this run',
    example: '10000000.00',
  })
  totalDeductions!: string

  @ApiProperty({
    description: 'Total net salary for this run',
    example: '110000000.00',
  })
  netSalary!: string

  @ApiProperty({
    description: 'Number of generated payslips in this run',
    example: 24,
  })
  payslipCount!: number

  @ApiProperty({
    description: 'Creator user full name',
    example: 'Payroll Officer',
  })
  createdBy!: string

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-03-31T12:00:00.000Z',
  })
  createdAt!: Date

  @ApiProperty({
    description: 'Last updater user full name',
    example: 'Payroll Officer',
  })
  updatedBy!: string

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-03-31T12:00:00.000Z',
  })
  updatedAt!: Date
}

export class PayslipItemDto {
  @ApiProperty({
    description: 'Payslip item ID',
    example: 100,
  })
  id!: number

  @ApiProperty({
    description: 'Component name used in this payslip item',
    example: 'Transport Allowance',
  })
  componentName!: string

  @ApiProperty({
    description: 'Component type',
    enum: SALARY_TYPES,
    example: 'allowance',
  })
  componentType!: SalaryType

  @ApiProperty({
    description: 'Amount for this payslip item',
    example: '500000.00',
  })
  amount!: string
}

export class PayslipDto {
  @ApiProperty({
    description: 'Payslip ID',
    example: 1,
  })
  id!: number

  @ApiProperty({
    description: 'Payslip run ID',
    example: 1,
  })
  payslipRunId!: number

  @ApiPropertyOptional({
    description: 'Payslip period ID',
    example: 1,
  })
  payslipPeriodId?: number

  @ApiPropertyOptional({
    description: 'Payslip period name',
    example: 'March 2026 Payroll',
  })
  payslipPeriodName?: string

  @ApiProperty({
    description: 'Tenant ID',
    example: 1,
  })
  tenantId!: number

  @ApiProperty({
    description: 'Employee ID',
    example: 10,
  })
  employeeId!: number

  @ApiPropertyOptional({
    description: 'Employee code',
    example: 'EMP-000010',
  })
  employeeCode?: string

  @ApiPropertyOptional({
    description: 'Employee full name',
    example: 'Jane Employee',
  })
  employeeName?: string

  @ApiProperty({
    description: 'Base salary',
    example: '10000000.00',
  })
  baseSalary!: string

  @ApiProperty({
    description: 'Gross salary',
    example: '12000000.00',
  })
  grossSalary!: string

  @ApiProperty({
    description: 'Total allowance',
    example: '2500000.00',
  })
  totalAllowance!: string

  @ApiProperty({
    description: 'Total deduction',
    example: '500000.00',
  })
  totalDeduction!: string

  @ApiProperty({
    description: 'Net salary',
    example: '11500000.00',
  })
  netSalary!: string

  @ApiProperty({
    description: 'Creator user full name',
    example: 'Payroll Officer',
  })
  createdBy!: string

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-03-31T12:00:00.000Z',
  })
  createdAt!: Date

  @ApiProperty({
    description: 'Last updater user full name',
    example: 'Payroll Officer',
  })
  updatedBy!: string

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-03-31T12:00:00.000Z',
  })
  updatedAt!: Date

  @ApiPropertyOptional({
    description: 'Detailed items used to build this payslip',
    type: [PayslipItemDto],
  })
  payslipItems?: PayslipItemDto[]
}
