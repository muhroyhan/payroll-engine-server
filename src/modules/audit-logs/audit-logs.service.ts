import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/database/prisma.service'
import { AuditLogs } from '@prismaclient/client'
import { CreateAuditLogDto } from './dto/create-audit-log.dto'

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  create(input: CreateAuditLogDto): Promise<AuditLogs> {
    const data = {
      action: input.action,
      entity: input.entity,
      entityType: input.entityType,
      entityId: input.entityId,
      actorUser: {},
      tenant: {},
    }
    return this.prisma.auditLogs.create({ data })
  }

  findAll(params?: {
    where?: {
      tenantId?: string
      actorUserId?: string
      entity?: string
      entityType?: string
      entityId?: string
    }
    orderBy?: {
      updatedAt?: 'asc' | 'desc'
      entity?: 'asc' | 'desc'
      entityType?: 'asc' | 'desc'
      entityId?: 'asc' | 'desc'
    }
  }): Promise<AuditLogs[]> {
    return this.prisma.auditLogs.findMany(params)
  }

  findOne({ id }: { id: string }): Promise<AuditLogs | null> {
    return this.prisma.auditLogs.findUnique({
      where: { id },
    })
  }
}
