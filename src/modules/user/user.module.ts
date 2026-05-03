import { Module } from '@nestjs/common'
import { PrismaModule } from '@src/database/prisma.module'
import { AbilityFactory } from '@src/common/casl'
import { UserController } from './controllers'
import { UserService } from './services'

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [UserService, AbilityFactory],
  exports: [UserService],
})
export class UserModule {}
