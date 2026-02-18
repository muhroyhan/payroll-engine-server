import { Module } from '@nestjs/common'
import { UsersService } from './services'
import { UsersController } from './controllers'
import { PrismaService } from '@src/database/prisma.service'

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
})
export class UsersModule {}
