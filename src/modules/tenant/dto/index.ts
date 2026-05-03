import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator'

/**
 * Create Tenant DTO
 * Used when creating a new tenant organization
 * Code is auto-generated in format: TNT-{increment number}
 */
export class CreateTenantDto {
  @ApiProperty({
    description: 'Tenant name',
    example: 'Acme Corporation',
    minLength: 3,
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  name!: string
}

/**
 * Update Tenant DTO
 * Used when updating tenant information
 */
export class UpdateTenantDto {
  @ApiPropertyOptional({
    description: 'Tenant name',
    example: 'Acme Corporation Inc',
  })
  @IsOptional()
  @IsString()
  @Length(3, 255)
  name?: string
}

/**
 * Tenant Response DTO
 * Returned in API responses
 */
export class TenantDto {
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
    description: 'Tenant code/slug',
    example: 'acme-corp',
  })
  code!: string

  @ApiProperty({
    description: 'Creator user ID',
  })
  createdBy!: string

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-02-22T10:30:00Z',
  })
  createdAt!: Date

  @ApiProperty({
    description: 'Last updater user ID',
  })
  updatedBy!: string

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-02-22T10:30:00Z',
  })
  updatedAt!: Date
}
