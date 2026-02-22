import { Module } from '@nestjs/common'
import { TenantService } from './services'
import { TenantController } from './controllers'
import { PrismaModule } from '@src/database/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
