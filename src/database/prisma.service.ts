import { Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prismaclient/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { buildDatabaseUrl } from './database-url'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const pool = new PrismaPg({ connectionString: buildDatabaseUrl() })
    super({ adapter: pool })
  }

  async onModuleInit(): Promise<void> {
    await this.$connect()
  }
}
