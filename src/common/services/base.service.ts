import { Logger } from '@nestjs/common'
import { PaginatedResponse, PaginationDto } from '../dto/pagination.dto'
import { AuditContext } from '../types/audit.type'

/**
 * Abstract base service for all feature modules
 * Provides common functionality for CRUD operations and audit tracking
 *
 * @template T - The entity type this service manages
 * @template CreateDto - DTO type for creating entities
 * @template UpdateDto - DTO type for updating entities
 */
export abstract class BaseService<T, CreateDto = any, UpdateDto = any> {
  protected readonly logger: Logger

  constructor(serviceName: string) {
    this.logger = new Logger(serviceName)
  }

  /**
   * Get all entities with pagination and filtering
   *
   * @param pagination - Pagination and filtering parameters
   * @param auditContext - Audit context with user and tenant info
   * @returns Paginated response of entities
   */
  abstract findAll(
    pagination: PaginationDto,
    auditContext: AuditContext,
  ): Promise<PaginatedResponse<T>>

  /**
   * Get a single entity by ID
   *
   * @param id - Entity ID
   * @param auditContext - Audit context with user and tenant info
   * @returns The entity
   * @throws NotFoundException if entity not found
   */
  abstract findOne(id: number, auditContext: AuditContext): Promise<T>

  /**
   * Create a new entity
   *
   * @param createDto - Data for creating the entity
   * @param auditContext - Audit context with user and tenant info
   * @returns The created entity
   */
  abstract create(createDto: CreateDto, auditContext: AuditContext): Promise<T>

  /**
   * Update an existing entity
   *
   * @param id - Entity ID
   * @param updateDto - Data for updating the entity
   * @param auditContext - Audit context with user and tenant info
   * @returns The updated entity
   * @throws NotFoundException if entity not found
   */
  abstract update(
    id: number,
    updateDto: UpdateDto,
    auditContext: AuditContext,
  ): Promise<T>

  /**
   * Delete an entity
   *
   * @param id - Entity ID
   * @param auditContext - Audit context with user and tenant info
   * @throws NotFoundException if entity not found
   */
  abstract delete(id: number, auditContext: AuditContext): Promise<void>

  /**
   * Helper method to calculate pagination offset
   *
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @returns Offset for database query
   */
  protected calculateOffset(page: number, limit: number): number {
    // Ensure values are numbers (query params come as strings)
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit
    return (pageNum - 1) * limitNum
  }

  /**
   * Normalize pagination values to ensure they are numbers
   * Query parameters are received as strings and need conversion
   *
   * @param pagination - Pagination DTO with potentially string values
   * @returns Normalized pagination with numeric values
   */
  protected normalizePaginationDto(pagination: PaginationDto): {
    page: number
    limit: number
    search?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  } {
    return {
      page:
        typeof pagination.page === 'string'
          ? parseInt(pagination.page, 10)
          : pagination.page,
      limit:
        typeof pagination.limit === 'string'
          ? parseInt(pagination.limit, 10)
          : pagination.limit,
      search: pagination.search,
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    }
  }

  /**
   * Helper method to filter by search query
   * Override in specific services to implement search logic
   *
   * @param query - Search query string
   * @returns Filter object (specific to each service)
   */
  protected buildSearchFilter(query?: string): any {
    if (!query) return {}
    return {} // Override in child services
  }

  /**
   * Helper to build sort configuration
   *
   * @param sortBy - Field to sort by
   * @param sortOrder - Sort order (asc/desc)
   * @param allowedSortFields - Optional allowlist of sort fields
   * @returns Sort configuration
   */
  protected buildSortConfig(
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    allowedSortFields?: string[],
  ): any {
    if (!sortBy) return { createdAt: 'desc' }

    if (
      Array.isArray(allowedSortFields) &&
      !allowedSortFields.includes(sortBy)
    ) {
      return { createdAt: 'desc' }
    }

    return { [sortBy]: sortOrder || 'desc' }
  }

  /**
   * Log with context information
   *
   * @param level - Log level (log, warn, error, debug)
   * @param message - Log message
   * @param context - Additional context
   */
  protected logWithContext(
    level: 'log' | 'warn' | 'error' | 'debug',
    message: string,
    context?: AuditContext,
  ): void {
    const contextStr = context
      ? ` [User: ${context.userId}, Tenant: ${context.tenantId}, Action: ${context.action}]`
      : ''

    this.logger[level](`${message}${contextStr}`)
  }
}
