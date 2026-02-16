import { Controller, Get, Post, Body, Param } from '@nestjs/common'
import { AuditLogsService } from './audit-logs.service'
import { CreateAuditLogDto } from './dto/create-audit-log.dto'
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger'

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Post()
  create(@Body() body: CreateAuditLogDto) {
    return this.auditLogsService.create(body)
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'get paginated audit logs' })
  @Get('paginated')
  findPaginated() {
    return this.auditLogsService.findAll()
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'get audit log by id' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auditLogsService.findOne({ id })
  }
}
