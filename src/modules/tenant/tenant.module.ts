import { Module } from '@nestjs/common'
import { TenantService } from './services'
import { TenantController } from './controllers'
import { PrismaModule } from '@src/database/prisma.module'
import { AbilityFactory } from '@src/common/casl'

@Module({
  imports: [PrismaModule],
  controllers: [TenantController],
  providers: [TenantService, AbilityFactory],
  exports: [TenantService],
})
export class TenantModule {}
