import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import type { AuthenticatedRequest } from '@src/common/types'

import { JwtAuthGuard } from '@src/modules/auth/guards/jwt-auth.guard'
import {
  PaginatedResponse,
  PaginationDto,
  SingleResponse,
} from '@src/common/dto'
import { buildAuditContext } from '@src/common/utils'
import { TenantService } from '../services'
import { CreateTenantDto, TenantDto, UpdateTenantDto } from '../dto'

@ApiTags('Tenant Management')
@Controller('tenants')
export class TenantController {
  constructor(private tenantService: TenantService) {}

  /**
   * List all tenants (paginated)
   * Requires authentication
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all tenants',
    description: 'Get paginated list of all tenants. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenants retrieved successfully',
    type: PaginatedResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll(
    @Query() pagination: PaginationDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PaginatedResponse<TenantDto>> {
    const auditContext = buildAuditContext(request, 'READ')
    return this.tenantService.findAll(pagination, auditContext)
  }

  /**
   * Get single tenant by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get tenant by ID',
    description: 'Retrieve a single tenant information',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant retrieved successfully',
    type: SingleResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findOne(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<SingleResponse<TenantDto>> {
    const auditContext = buildAuditContext(request, 'READ')
    const data = await this.tenantService.findOne(id, auditContext)

    return new SingleResponse(data, 'Tenant retrieved successfully')
  }

  /**
   * Create new tenant
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new tenant',
    description: 'Create a new tenant organization',
  })
  @ApiResponse({
    status: 201,
    description: 'Tenant created successfully',
    type: SingleResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async create(
    @Body() createDto: CreateTenantDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<SingleResponse<TenantDto>> {
    const auditContext = buildAuditContext(request, 'CREATE')
    const data = await this.tenantService.create(createDto, auditContext)

    return new SingleResponse(data, 'Tenant created successfully')
  }

  /**
   * Update tenant
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update tenant',
    description: 'Update tenant information',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant updated successfully',
    type: SingleResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTenantDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<SingleResponse<TenantDto>> {
    const auditContext = buildAuditContext(request, 'UPDATE')
    const data = await this.tenantService.update(id, updateDto, auditContext)

    return new SingleResponse(data, 'Tenant updated successfully')
  }

  /**
   * Delete tenant
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete tenant',
    description: 'Delete a tenant and all related data',
  })
  @ApiResponse({
    status: 204,
    description: 'Tenant deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async delete(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const auditContext = buildAuditContext(request, 'DELETE')
    await this.tenantService.delete(id, auditContext)
  }

  /**
   * Get tenant statistics
   */
  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get tenant statistics',
    description:
      'Get statistics for a tenant (users count, employees count, etc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: SingleResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async getStats(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<SingleResponse<any>> {
    const auditContext = buildAuditContext(request, 'READ')

    // Verify tenant exists
    await this.tenantService.findOne(id, auditContext)

    const stats = {
      usersCount: await this.tenantService.getTenantUsersCount(id),
      employeesCount: await this.tenantService.getTenantEmployeesCount(id),
    }

    return new SingleResponse(stats, 'Tenant statistics retrieved successfully')
  }
}
