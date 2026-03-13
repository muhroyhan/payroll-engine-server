import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import type { AuthenticatedRequest } from '@src/common/types'
import {
  PaginatedResponse,
  PaginationDto,
  SingleResponse,
} from '@src/common/dto'
import { buildAuditContext } from '@src/common/utils'
import { Roles } from '@src/common/decorators/roles.decorator'
import { SalaryComponentService } from '../services/salary-component.service'
import {
  CreateSalaryComponentDto,
  SalaryComponentDto,
  UpdateSalaryComponentDto,
} from '../dto'

@ApiTags('Salary Component Management')
@ApiBearerAuth()
@Controller('salary-components')
export class SalaryComponentController {
  constructor(private salaryComponentService: SalaryComponentService) {}

  @Get()
  @Roles('tenant_admin', 'payroll_officer', 'viewer')
  @ApiOperation({
    summary: 'List salary components',
    description:
      'Get paginated salary components within current tenant scope (superadmin can view all tenants)',
  })
  @ApiResponse({
    status: 200,
    description: 'Salary components retrieved successfully',
    type: PaginatedResponse,
  })
  async findAll(
    @Query() pagination: PaginationDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PaginatedResponse<SalaryComponentDto>> {
    const auditContext = buildAuditContext(request, 'READ')
    return await this.salaryComponentService.findAll(pagination, auditContext)
  }

  @Get(':id')
  @Roles('tenant_admin', 'payroll_officer', 'viewer')
  @ApiOperation({
    summary: 'Get salary component by ID',
    description: 'Get salary component detail in current tenant scope',
  })
  @ApiResponse({
    status: 200,
    description: 'Salary component retrieved successfully',
    type: SingleResponse,
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<SingleResponse<SalaryComponentDto>> {
    const auditContext = buildAuditContext(request, 'READ')
    const data = await this.salaryComponentService.findOne(id, auditContext)
    return new SingleResponse(data, 'Salary component retrieved successfully')
  }

  @Post()
  @Roles('tenant_admin', 'payroll_officer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create salary component',
    description:
      'Create salary component in current tenant (superadmin can assign tenantId)',
  })
  @ApiResponse({
    status: 201,
    description: 'Salary component created successfully',
    type: SingleResponse,
  })
  async create(
    @Body() createDto: CreateSalaryComponentDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<SingleResponse<SalaryComponentDto>> {
    const auditContext = buildAuditContext(request, 'CREATE')
    const data = await this.salaryComponentService.create(
      createDto,
      auditContext,
    )
    return new SingleResponse(data, 'Salary component created successfully')
  }

  @Patch(':id')
  @Roles('tenant_admin', 'payroll_officer')
  @ApiOperation({
    summary: 'Update salary component',
    description: 'Update salary component in current tenant scope',
  })
  @ApiResponse({
    status: 200,
    description: 'Salary component updated successfully',
    type: SingleResponse,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSalaryComponentDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<SingleResponse<SalaryComponentDto>> {
    const auditContext = buildAuditContext(request, 'UPDATE')
    const data = await this.salaryComponentService.update(
      id,
      updateDto,
      auditContext,
    )
    return new SingleResponse(data, 'Salary component updated successfully')
  }

  @Delete(':id')
  @Roles('tenant_admin', 'payroll_officer')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete salary component',
    description: 'Delete salary component in current tenant scope',
  })
  @ApiResponse({
    status: 204,
    description: 'Salary component deleted successfully',
  })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const auditContext = buildAuditContext(request, 'DELETE')
    await this.salaryComponentService.delete(id, auditContext)
  }
}
