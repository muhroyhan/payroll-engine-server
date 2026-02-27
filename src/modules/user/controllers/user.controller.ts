import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
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
import { Roles } from '@src/common/decorators/roles.decorator'
import { RolesGuard } from '@src/common/guards/roles.guard'
import { UserService } from '../services'
import {
  CreateUserDto,
  UpdateUserDto,
  UserDto,
  UserTenantOptionDto,
  UserTenantOptionsQueryDto,
} from '../dto'

@ApiTags('User Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @Roles('tenant_admin', 'payroll_officer')
  @ApiOperation({
    summary: 'List tenant users',
    description: 'Get paginated list of users inside current tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: PaginatedResponse,
  })
  async findAll(
    @Query() pagination: PaginationDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PaginatedResponse<UserDto>> {
    const auditContext = buildAuditContext(request, 'READ')
    return this.userService.findAll(pagination, auditContext)
  }

  @Get('tenant-options')
  @Roles('tenant_admin', 'payroll_officer')
  @ApiOperation({
    summary: 'Get tenant options for user form',
    description:
      'Get lightweight tenant options (id, name, code) for user add/edit form',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant options retrieved successfully',
    type: SingleResponse,
  })
  async getTenantOptions(
    @Query() query: UserTenantOptionsQueryDto,
  ): Promise<SingleResponse<UserTenantOptionDto[]>> {
    const data = await this.userService.findTenantOptions(query.search)
    return new SingleResponse(data, 'Tenant options retrieved successfully')
  }

  @Get(':id')
  @Roles('tenant_admin', 'payroll_officer')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Get user details within current tenant scope',
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: SingleResponse,
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<SingleResponse<UserDto>> {
    const auditContext = buildAuditContext(request, 'READ')
    const data = await this.userService.findOne(id, auditContext)
    return new SingleResponse(data, 'User retrieved successfully')
  }

  @Post()
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create user',
    description: 'Create new user in current tenant',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: SingleResponse,
  })
  async create(
    @Body() createDto: CreateUserDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<SingleResponse<UserDto>> {
    const auditContext = buildAuditContext(request, 'CREATE')
    const data = await this.userService.create(createDto, auditContext)
    return new SingleResponse(data, 'User created successfully')
  }

  @Patch(':id')
  @Roles('tenant_admin')
  @ApiOperation({
    summary: 'Update user',
    description: 'Update user data in current tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: SingleResponse,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<SingleResponse<UserDto>> {
    const auditContext = buildAuditContext(request, 'UPDATE')
    const data = await this.userService.update(id, updateDto, auditContext)
    return new SingleResponse(data, 'User updated successfully')
  }

  @Delete(':id')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user',
    description: 'Delete user in current tenant',
  })
  @ApiResponse({
    status: 204,
    description: 'User deleted successfully',
  })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const auditContext = buildAuditContext(request, 'DELETE')
    await this.userService.delete(id, auditContext)
  }
}
