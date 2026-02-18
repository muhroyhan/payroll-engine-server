import { Module } from '@nestjs/common'
import { AuditService } from './services'
import { AuditController } from './controllers'

@Module({
  controllers: [AuditController],
  providers: [AuditService],
})
export class AuditModule {}
