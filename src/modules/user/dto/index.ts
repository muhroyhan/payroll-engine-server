import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsBoolean,
  IsDefined,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsStrongPassword,
  Length,
  ValidateIf,
} from 'class-validator'
import type { Role } from '@src/common/types'

const ROLES: Role[] = [
  'superadmin',
  'tenant_admin',
  'payroll_officer',
  'viewer',
]

export class UserTenantOptionsQueryDto {
  @ApiPropertyOptional({
    description: 'Optional search by tenant name or code',
    example: 'acme',
  })
  @IsOptional()
  @IsString()
  search?: string
}

export class UserTenantOptionDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: 1,
  })
  id!: number

  @ApiProperty({
    description: 'Tenant name',
    example: 'Acme Corporation',
  })
  name!: string

  @ApiProperty({
    description: 'Tenant code',
    example: 'TNT-000001',
  })
  code!: string
}

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'staff@acme.com',
  })
  @IsEmail()
  email!: string

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @Length(3, 255)
  fullName!: string

  @ApiProperty({
    description: 'User password',
    example: 'Test12345!',
  })
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password!: string

  @ApiPropertyOptional({
    description: 'User role',
    enum: ROLES,
    example: 'viewer',
  })
  @IsOptional()
  @IsIn(ROLES)
  role?: Role

  @ApiPropertyOptional({
    description: 'Whether user account is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional({
    description: 'Tenant ID to assign user to (optional for superadmin)',
    example: 1,
  })
  @ValidateIf((dto: CreateUserDto) => (dto.role ?? 'viewer') !== 'superadmin')
  @IsDefined()
  @IsNumber()
  tenantId?: number
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User email address',
    example: 'updated.staff@acme.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string

  @ApiPropertyOptional({
    description: 'User full name',
    example: 'John Doe Updated',
    minLength: 3,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(3, 255)
  fullName?: string

  @ApiPropertyOptional({
    description: 'User password',
    example: 'NewPass12345!',
  })
  @IsOptional()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password?: string

  @ApiPropertyOptional({
    description: 'User role',
    enum: ROLES,
    example: 'payroll_officer',
  })
  @IsOptional()
  @IsIn(ROLES)
  role?: Role

  @ApiPropertyOptional({
    description: 'Whether user account is active',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional({
    description:
      'Tenant ID to assign user to (required if role is not superadmin)',
    example: 1,
  })
  @ValidateIf(
    (dto: UpdateUserDto) => dto.role !== undefined && dto.role !== 'superadmin',
  )
  @IsDefined()
  @IsNumber()
  tenantId?: number
}

export class UserDto {
  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  id!: number

  @ApiPropertyOptional({
    description: 'Tenant ID',
    example: 1,
  })
  tenantId!: number | null

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
    description: 'User email address',
    example: 'staff@acme.com',
  })
  email!: string

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  fullName!: string

  @ApiProperty({
    description: 'User role',
    enum: ROLES,
    example: 'viewer',
  })
  role!: Role

  @ApiProperty({
    description: 'Whether user account is active',
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
