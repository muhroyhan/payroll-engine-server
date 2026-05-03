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
  StreamableFile,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
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
import {
  CreatePayslipPeriodDto,
  PayslipDto,
  PayslipListQueryDto,
  PayslipPeriodDto,
  PayslipRunDto,
  ProcessPayslipPeriodDto,
  UpdatePayslipPeriodDto,
} from '../dto'
import { PayslipPdfService, PayslipService } from '../services'

@ApiTags('Payslip Management')
@ApiBearerAuth()
@Controller('payslips')
export class PayslipController {
  constructor(
    private payslipService: PayslipService,
    private payslipPdfService: PayslipPdfService,
  ) {}

  @Get('periods')
  @Roles('tenant_admin', 'payroll_officer', 'viewer')
  @ApiOperation({
    summary: 'List payslip periods',
    description:
      'Get paginated payslip periods within current tenant scope (superadmin can view all tenants)',
  })
  @ApiResponse({
    status: 200,
    description: 'Payslip periods retrieved successfully',
    type: PaginatedResponse,
  })
  async findPeriods(
    @Query() pagination: PaginationDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PaginatedResponse<PayslipPeriodDto>> {
    const auditContext = buildAuditContext(request, 'READ')
    return await this.payslipService.findAll(pagination, auditContext)
  }

  @Get('periods/:id/pdf')
  @Roles('tenant_admin', 'payroll_officer', 'viewer')
  @ApiOperation({
    summary: 'Download all payslips in a period as ZIP',
    description:
      'Generate a ZIP archive containing one PDF payslip per employee for every payslip run in the period',
  })
  @ApiProduces('application/zip')
  @ApiResponse({
    status: 200,
    description: 'ZIP file containing payslip PDFs',
    schema: { type: 'string', format: 'binary' },
  })
  async downloadPeriodPdfs(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<StreamableFile> {
    const auditContext = buildAuditContext(request, 'READ')
    const { buffer, filename } = await this.payslipPdfService.downloadPeriodZip(
      id,
      auditContext,
    )
    return new StreamableFile(buffer, {
      type: 'application/zip',
      disposition: `attachment; filename="${filename}"`,
      length: buffer.length,
    })
  }

  @Get('periods/:id')
  @Roles('tenant_admin', 'payroll_officer', 'viewer')
  @ApiOperation({
    summary: 'Get payslip period by ID',
    description: 'Get detailed payslip period in current tenant scope',
  })
  @ApiResponse({
    status: 200,
    description: 'Payslip period retrieved successfully',
    type: SingleResponse,
  })
  async findPeriodById(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<SingleResponse<PayslipPeriodDto>> {
    const auditContext = buildAuditContext(request, 'READ')
    const data = await this.payslipService.findOne(id, auditContext)
    return new SingleResponse(data, 'Payslip period retrieved successfully')
  }

  @Post('periods')
  @Roles('tenant_admin', 'payroll_officer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create payslip period',
    description:
      'Create new payslip period in current tenant (superadmin can assign tenantId)',
  })
  @ApiResponse({
    status: 201,
    description: 'Payslip period created successfully',
    type: SingleResponse,
  })
  async createPeriod(
    @Body() createDto: CreatePayslipPeriodDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<SingleResponse<PayslipPeriodDto>> {
    const auditContext = buildAuditContext(request, 'CREATE')
    const data = await this.payslipService.create(createDto, auditContext)
    return new SingleResponse(data, 'Payslip period created successfully')
  }

  @Patch('periods/:id')
  @Roles('tenant_admin', 'payroll_officer')
  @ApiOperation({
    summary: 'Update payslip period',
    description: 'Update payslip period in current tenant scope',
  })
  @ApiResponse({
    status: 200,
    description: 'Payslip period updated successfully',
    type: SingleResponse,
  })
  async updatePeriod(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePayslipPeriodDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<SingleResponse<PayslipPeriodDto>> {
    const auditContext = buildAuditContext(request, 'UPDATE')
    const data = await this.payslipService.update(id, updateDto, auditContext)
    return new SingleResponse(data, 'Payslip period updated successfully')
  }

  @Delete('periods/:id')
  @Roles('tenant_admin', 'payroll_officer')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete payslip period',
    description: 'Delete draft payslip period in current tenant scope',
  })
  @ApiResponse({
    status: 204,
    description: 'Payslip period deleted successfully',
  })
  async deletePeriod(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const auditContext = buildAuditContext(request, 'DELETE')
    await this.payslipService.delete(id, auditContext)
  }

  @Post('periods/:id/process')
  @Roles('tenant_admin', 'payroll_officer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Process payroll for period',
    description:
      'Generate a payroll run and payslips from active employee salary components for the selected draft period, including optional BPJS and PPh21 statutory deductions based on regulation profile',
  })
  @ApiResponse({
    status: 201,
    description: 'Payslip run created successfully',
    type: SingleResponse,
  })
  async processPeriod(
    @Param('id', ParseIntPipe) id: number,
    @Body() processDto: ProcessPayslipPeriodDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<SingleResponse<PayslipRunDto>> {
    const auditContext = buildAuditContext(request, 'CREATE')
    const data = await this.payslipService.processPeriod(
      id,
      processDto,
      auditContext,
    )
    return new SingleResponse(data, 'Payslip run created successfully')
  }

  @Post('periods/:id/lock')
  @Roles('tenant_admin', 'payroll_officer')
  @ApiOperation({
    summary: 'Lock payslip period',
    description:
      'Lock a processed period to prevent future modification and preserve finalized payroll history',
  })
  @ApiResponse({
    status: 200,
    description: 'Payslip period locked successfully',
    type: SingleResponse,
  })
  async lockPeriod(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<SingleResponse<PayslipPeriodDto>> {
    const auditContext = buildAuditContext(request, 'UPDATE')
    const data = await this.payslipService.lockPeriod(id, auditContext)
    return new SingleResponse(data, 'Payslip period locked successfully')
  }

  @Get('periods/:id/runs')
  @Roles('tenant_admin', 'payroll_officer', 'viewer')
  @ApiOperation({
    summary: 'List payroll runs by period',
    description: 'Get paginated payroll runs of a payslip period',
  })
  @ApiResponse({
    status: 200,
    description: 'Payslip runs retrieved successfully',
    type: PaginatedResponse,
  })
  async findRunsByPeriod(
    @Param('id', ParseIntPipe) id: number,
    @Query() pagination: PaginationDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PaginatedResponse<PayslipRunDto>> {
    const auditContext = buildAuditContext(request, 'READ')
    return await this.payslipService.findRunsByPeriod(
      id,
      pagination,
      auditContext,
    )
  }

  @Get()
  @Roles('tenant_admin', 'payroll_officer', 'viewer')
  @ApiOperation({
    summary: 'List payslips',
    description:
      'Get paginated payslips with optional filters by run, period, and employee',
  })
  @ApiResponse({
    status: 200,
    description: 'Payslips retrieved successfully',
    type: PaginatedResponse,
  })
  async findPayslips(
    @Query() query: PayslipListQueryDto,
    @Query() pagination: PaginationDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PaginatedResponse<PayslipDto>> {
    const auditContext = buildAuditContext(request, 'READ')
    return await this.payslipService.findPayslips(
      query,
      pagination,
      auditContext,
    )
  }

  @Get(':id/pdf')
  @Roles('tenant_admin', 'payroll_officer', 'viewer')
  @ApiOperation({
    summary: 'Download a single payslip as PDF',
    description:
      'Generate and download a PDF payslip for a specific payslip ID',
  })
  @ApiProduces('application/pdf')
  @ApiResponse({
    status: 200,
    description: 'PDF payslip file',
    schema: { type: 'string', format: 'binary' },
  })
  async downloadPayslipPdf(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<StreamableFile> {
    const auditContext = buildAuditContext(request, 'READ')
    const { buffer, filename } = await this.payslipPdfService.downloadSingle(
      id,
      auditContext,
    )
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
      length: buffer.length,
    })
  }

  @Get(':id')
  @Roles('tenant_admin', 'payroll_officer', 'viewer')
  @ApiOperation({
    summary: 'Get payslip by ID',
    description: 'Get detailed payslip with all itemized components',
  })
  @ApiResponse({
    status: 200,
    description: 'Payslip retrieved successfully',
    type: SingleResponse,
  })
  async findPayslipById(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<SingleResponse<PayslipDto>> {
    const auditContext = buildAuditContext(request, 'READ')
    const data = await this.payslipService.findPayslipById(id, auditContext)
    return new SingleResponse(data, 'Payslip retrieved successfully')
  }
}
