import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator'

const EMPLOYEE_TYPES = ['permanent', 'contract'] as const
const SALARY_TYPES = ['allowance', 'deduction'] as const
const CALCULATION_TYPES = ['fixed', 'percentage'] as const

export type EmployeeType = (typeof EMPLOYEE_TYPES)[number]
export type SalaryType = (typeof SALARY_TYPES)[number]
export type CalculationType = (typeof CALCULATION_TYPES)[number]

export class EmployeeSalaryComponentOptionsQueryDto {
  @ApiPropertyOptional({
    description: 'Optional search by salary component name',
    example: 'allowance',
  })
  @IsOptional()
  @IsString()
  search?: string

  @ApiPropertyOptional({
    description: 'Include inactive salary components',
    example: false,
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeInactive?: boolean
}

export class EmployeeSalaryComponentOptionDto {
  @ApiProperty({
    description: 'Salary component ID',
    example: 1,
  })
  id!: number

  @ApiProperty({
    description: 'Salary component name',
    example: 'Transport Allowance',
  })
  name!: string

  @ApiProperty({
    description: 'Salary component type',
    enum: SALARY_TYPES,
    example: 'allowance',
  })
  type!: SalaryType

  @ApiProperty({
    description: 'Calculation type',
    enum: CALCULATION_TYPES,
    example: 'fixed',
  })
  calculationType!: CalculationType

  @ApiProperty({
    description: 'Default value',
    example: '500000.00',
  })
  defaultValue!: string

  @ApiProperty({
    description: 'Whether component is taxable',
    example: false,
  })
  isTaxable!: boolean

  @ApiProperty({
    description: 'Whether component is active',
    example: true,
  })
  isActive!: boolean
}

export class EmployeeSalaryComponentCreateInputDto {
  @ApiProperty({
    description: 'Employee salary component name',
    example: 'Transport Allowance',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @Length(2, 255)
  name!: string

  @ApiPropertyOptional({
    description: 'Salary component type',
    enum: SALARY_TYPES,
    example: 'allowance',
  })
  @IsOptional()
  @IsIn(SALARY_TYPES)
  type?: SalaryType

  @ApiPropertyOptional({
    description: 'Calculation type',
    enum: CALCULATION_TYPES,
    example: 'fixed',
  })
  @IsOptional()
  @IsIn(CALCULATION_TYPES)
  calculationType?: CalculationType

  @ApiProperty({
    description: 'Default value',
    example: 500000,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  defaultValue!: number

  @ApiPropertyOptional({
    description: 'Whether component is taxable',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean

  @ApiPropertyOptional({
    description: 'Whether component is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class EmployeeSalaryComponentUpdateInputDto {
  @ApiProperty({
    description: 'Employee salary component ID',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  id!: number

  @ApiPropertyOptional({
    description: 'Employee salary component name',
    example: 'Updated Transport Allowance',
    minLength: 2,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(2, 255)
  name?: string

  @ApiPropertyOptional({
    description: 'Salary component type',
    enum: SALARY_TYPES,
    example: 'deduction',
  })
  @IsOptional()
  @IsIn(SALARY_TYPES)
  type?: SalaryType

  @ApiPropertyOptional({
    description: 'Calculation type',
    enum: CALCULATION_TYPES,
    example: 'percentage',
  })
  @IsOptional()
  @IsIn(CALCULATION_TYPES)
  calculationType?: CalculationType

  @ApiPropertyOptional({
    description: 'Default value',
    example: 2.5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  defaultValue?: number

  @ApiPropertyOptional({
    description: 'Whether component is taxable',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean

  @ApiPropertyOptional({
    description: 'Whether component is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class EmployeeSalaryComponentSyncInputDto {
  @ApiPropertyOptional({
    description: 'Employee salary component ID (send for update)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  id?: number

  @ApiPropertyOptional({
    description: 'Employee salary component name',
    example: 'Transport Allowance',
    minLength: 2,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(2, 255)
  name?: string

  @ApiPropertyOptional({
    description: 'Salary component type',
    enum: SALARY_TYPES,
    example: 'allowance',
  })
  @IsOptional()
  @IsIn(SALARY_TYPES)
  type?: SalaryType

  @ApiPropertyOptional({
    description: 'Calculation type',
    enum: CALCULATION_TYPES,
    example: 'fixed',
  })
  @IsOptional()
  @IsIn(CALCULATION_TYPES)
  calculationType?: CalculationType

  @ApiPropertyOptional({
    description: 'Default value',
    example: 500000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  defaultValue?: number

  @ApiPropertyOptional({
    description: 'Whether component is taxable',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean

  @ApiPropertyOptional({
    description: 'Whether component is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class DeleteEmployeeDto {
  @ApiPropertyOptional({
    description:
      'Delete all employee salary components before deleting employee',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  deleteAllSalaryComponents?: boolean

  @ApiPropertyOptional({
    description:
      'Delete specific employee salary component IDs before deleting employee',
    type: [Number],
    example: [1, 2],
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  deleteSalaryComponentIds?: number[]
}

export class EmployeeSalaryComponentDto {
  @ApiProperty({
    description: 'Employee salary component ID',
    example: 1,
  })
  id!: number

  @ApiProperty({
    description: 'Salary component name',
    example: 'Transport Allowance',
  })
  name!: string

  @ApiProperty({
    description: 'Salary component type',
    enum: SALARY_TYPES,
    example: 'allowance',
  })
  type!: SalaryType

  @ApiProperty({
    description: 'Calculation type',
    enum: CALCULATION_TYPES,
    example: 'fixed',
  })
  calculationType!: CalculationType

  @ApiProperty({
    description: 'Default value',
    example: '500000.00',
  })
  defaultValue!: string

  @ApiProperty({
    description: 'Whether component is taxable',
    example: false,
  })
  isTaxable!: boolean

  @ApiProperty({
    description: 'Whether component is active',
    example: true,
  })
  isActive!: boolean
}

export class CreateEmployeeDto {
  @ApiProperty({
    description: 'Employee full name',
    example: 'John Employee',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @Length(3, 255)
  fullName!: string

  @ApiProperty({
    description: 'Employee position/job title',
    example: 'Software Engineer',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @Length(2, 255)
  position!: string

  @ApiPropertyOptional({
    description: 'Employee type',
    enum: EMPLOYEE_TYPES,
    example: 'contract',
  })
  @IsOptional()
  @IsIn(EMPLOYEE_TYPES)
  employeeType?: EmployeeType

  @ApiProperty({
    description: 'Employee base salary',
    example: 10000000,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  baseSalary!: number

  @ApiProperty({
    description: 'Join date',
    example: '2026-03-01T00:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  joinDate!: Date

  @ApiPropertyOptional({
    description: 'Whether employee is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional({
    description:
      'Tenant ID to assign employee to (optional for superadmin; required for non-superadmin by scope)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tenantId?: number

  @ApiPropertyOptional({
    description: 'Employee salary components to create together with employee',
    type: [EmployeeSalaryComponentCreateInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeeSalaryComponentCreateInputDto)
  employeeSalaryComponents?: EmployeeSalaryComponentCreateInputDto[]
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional({
    description: 'Employee full name',
    example: 'John Employee Updated',
    minLength: 3,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(3, 255)
  fullName?: string

  @ApiPropertyOptional({
    description: 'Employee position/job title',
    example: 'Senior Software Engineer',
    minLength: 2,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(2, 255)
  position?: string

  @ApiPropertyOptional({
    description: 'Employee type',
    enum: EMPLOYEE_TYPES,
    example: 'permanent',
  })
  @IsOptional()
  @IsIn(EMPLOYEE_TYPES)
  employeeType?: EmployeeType

  @ApiPropertyOptional({
    description: 'Employee base salary',
    example: 12000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  baseSalary?: number

  @ApiPropertyOptional({
    description: 'Join date',
    example: '2026-03-10T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  joinDate?: Date

  @ApiPropertyOptional({
    description: 'Whether employee is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional({
    description: 'Tenant ID for reassignment (superadmin only)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tenantId?: number

  @ApiPropertyOptional({
    description:
      'Employee salary components payload; update existing items by id, create items without id, and delete existing items omitted from the array',
    type: [EmployeeSalaryComponentSyncInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeeSalaryComponentSyncInputDto)
  employeeSalaryComponents?: EmployeeSalaryComponentSyncInputDto[]

  @ApiPropertyOptional({
    description:
      'Backward-compatible alias for employeeSalaryComponents (typo support)',
    type: [EmployeeSalaryComponentSyncInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeeSalaryComponentSyncInputDto)
  employeeSalaryCompoennt?: EmployeeSalaryComponentSyncInputDto[]
}

export class EmployeeDto {
  @ApiProperty({
    description: 'Employee ID',
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
    example: 'TNT-000001',
  })
  tenantCode?: string

  @ApiProperty({
    description: 'Employee code',
    example: 'EMP-000001',
  })
  employeeCode!: string

  @ApiProperty({
    description: 'Employee full name',
    example: 'John Employee',
  })
  fullName!: string

  @ApiProperty({
    description: 'Employee position/job title',
    example: 'Software Engineer',
  })
  position!: string

  @ApiProperty({
    description: 'Employee type',
    enum: EMPLOYEE_TYPES,
    example: 'contract',
  })
  employeeType!: EmployeeType

  @ApiProperty({
    description: 'Employee base salary',
    example: '10000000.00',
  })
  baseSalary!: string

  @ApiProperty({
    description: 'Join date',
    example: '2026-03-01T00:00:00.000Z',
  })
  joinDate!: Date

  @ApiProperty({
    description: 'Whether employee is active',
    example: true,
  })
  isActive!: boolean

  @ApiProperty({
    description: 'Creator user full name',
    example: 'Admin User',
  })
  createdBy!: string

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-02-22T10:30:00Z',
  })
  createdAt!: Date

  @ApiProperty({
    description: 'Last updater user full name',
    example: 'Admin User',
  })
  updatedBy!: string

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-02-22T10:30:00Z',
  })
  updatedAt!: Date

  @ApiPropertyOptional({
    description: 'Employee salary components',
    type: [EmployeeSalaryComponentDto],
  })
  employeeSalaryComponents?: EmployeeSalaryComponentDto[]
}
