import { Module } from '@nestjs/common'
import { TenantService } from './services'
import { TenantController } from './controllers'

@Module({
  controllers: [TenantController],
  providers: [TenantService],
})
export class TenantModule {}
