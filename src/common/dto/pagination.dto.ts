import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, Min } from 'class-validator'

/**
 * Pagination request DTO
 * Used for any list/paginated endpoints
 */
export class PaginationDto {
  @ApiProperty({
    description: 'Page number (1-indexed)',
    example: 1,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  page: number = 1

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  limit: number = 10

  @ApiPropertyOptional({
    description: 'Search query string',
    example: 'John Doe',
  })
  @IsOptional()
  search?: string

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
  })
  @IsOptional()
  sortBy?: string

  @ApiPropertyOptional({
    description: 'Sort order (asc or desc)',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc'
}

/**
 * Paginated response wrapper
 * Generic response structure for all paginated endpoints
 */
export class PaginatedResponse<T> {
  @ApiProperty({
    description: 'Array of items',
  })
  data: T[]

  @ApiProperty({
    description: 'Total number of items',
    example: 100,
  })
  total: number

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number

  @ApiProperty({
    description: 'Items per page',
    example: 10,
  })
  limit: number

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
  })
  totalPages: number

  @ApiProperty({
    description: 'Has next page',
    example: true,
  })
  hasNextPage: boolean

  @ApiProperty({
    description: 'Has previous page',
    example: false,
  })
  hasPreviousPage: boolean

  constructor(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ) {
    this.data = data
    this.total = total
    this.page = page
    this.limit = limit
    this.totalPages = Math.ceil(total / limit)
    this.hasNextPage = page < this.totalPages
    this.hasPreviousPage = page > 1
  }
}

/**
 * Response wrapper for single item
 */
export class SingleResponse<T> {
  @ApiProperty({
    description: 'Single item response',
  })
  data: T

  @ApiProperty({
    description: 'Success message',
  })
  message: string

  constructor(data: T, message = 'Success') {
    this.data = data
    this.message = message
  }
}
