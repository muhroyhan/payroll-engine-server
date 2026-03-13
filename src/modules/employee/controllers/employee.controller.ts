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
import { EmployeeService } from '../services/employee.service'
import { CreateEmployeeDto, EmployeeDto, UpdateEmployeeDto } from '../dto'

@ApiTags('Employee Management')
@ApiBearerAuth()
@Controller('employees')
export class EmployeeController {
  constructor(private employeeService: EmployeeService) {}

  @Get()
  @Roles('tenant_admin', 'payroll_officer', 'viewer')
  @ApiOperation({
    summary: 'List employees',
    description:
      'Get paginated employees within current tenant scope (superadmin can view all tenants)',
  })
  @ApiResponse({
    status: 200,
    description: 'Employees retrieved successfully',
    type: PaginatedResponse,
  })
  async findAll(
    @Query() pagination: PaginationDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PaginatedResponse<EmployeeDto>> {
    const auditContext = buildAuditContext(request, 'READ')
    return await this.employeeService.findAll(pagination, auditContext)
  }

  @Get(':id')
  @Roles('tenant_admin', 'payroll_officer', 'viewer')
  @ApiOperation({
    summary: 'Get employee by ID',
    description:
      'Get employee detail within current tenant scope (superadmin can access all tenants)',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee retrieved successfully',
    type: SingleResponse,
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<SingleResponse<EmployeeDto>> {
    const auditContext = buildAuditContext(request, 'READ')
    const data = await this.employeeService.findOne(id, auditContext)
    return new SingleResponse(data, 'Employee retrieved successfully')
  }

  @Post()
  @Roles('tenant_admin', 'payroll_officer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create employee',
    description:
      'Create new employee in current tenant (superadmin can assign tenantId)',
  })
  @ApiResponse({
    status: 201,
    description: 'Employee created successfully',
    type: SingleResponse,
  })
  async create(
    @Body() createDto: CreateEmployeeDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<SingleResponse<EmployeeDto>> {
    const auditContext = buildAuditContext(request, 'CREATE')
    const data = await this.employeeService.create(createDto, auditContext)
    return new SingleResponse(data, 'Employee created successfully')
  }

  @Patch(':id')
  @Roles('tenant_admin', 'payroll_officer')
  @ApiOperation({
    summary: 'Update employee',
    description: 'Update employee data in current tenant scope',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee updated successfully',
    type: SingleResponse,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEmployeeDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<SingleResponse<EmployeeDto>> {
    const auditContext = buildAuditContext(request, 'UPDATE')
    const data = await this.employeeService.update(id, updateDto, auditContext)
    return new SingleResponse(data, 'Employee updated successfully')
  }

  @Delete(':id')
  @Roles('tenant_admin', 'payroll_officer')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete employee',
    description: 'Delete employee in current tenant scope',
  })
  @ApiResponse({
    status: 204,
    description: 'Employee deleted successfully',
  })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const auditContext = buildAuditContext(request, 'DELETE')
    await this.employeeService.delete(id, auditContext)
  }
}
