import { Module } from '@nestjs/common'
import { PrismaModule } from '@src/database/prisma.module'
import { UserController } from './controllers'
import { UserService } from './services'

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
