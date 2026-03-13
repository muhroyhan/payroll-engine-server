import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
} from 'class-validator'

const SALARY_TYPES = ['allowance', 'deduction'] as const
const CALCULATION_TYPES = ['fixed', 'percentage'] as const

export type SalaryType = (typeof SALARY_TYPES)[number]
export type CalculationType = (typeof CALCULATION_TYPES)[number]

export class CreateSalaryComponentDto {
  @ApiProperty({
    description: 'Salary component name',
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
    description: 'Default value (fixed amount or percentage)',
    example: 1000000,
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

  @ApiPropertyOptional({
    description:
      'Tenant ID to assign component to (optional for superadmin; required for non-superadmin by scope)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tenantId?: number
}

export class UpdateSalaryComponentDto {
  @ApiPropertyOptional({
    description: 'Salary component name',
    example: 'Meal Allowance',
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
    description: 'Default value (fixed amount or percentage)',
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

  @ApiPropertyOptional({
    description: 'Tenant ID for reassignment (superadmin only)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tenantId?: number
}

export class SalaryComponentDto {
  @ApiProperty({
    description: 'Salary component ID',
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
    example: '1000000.00',
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
}
