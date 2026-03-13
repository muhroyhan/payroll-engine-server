import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsBoolean,
  IsDate,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
} from 'class-validator'

const EMPLOYEE_TYPES = ['permanent', 'contract'] as const

export type EmployeeType = (typeof EMPLOYEE_TYPES)[number]

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
}
