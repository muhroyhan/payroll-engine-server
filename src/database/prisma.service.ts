import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prismaclient/client'
import { PrismaPg } from '@prisma/adapter-pg'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const pool = new PrismaPg({
      connectionString:
        'postgresql://' +
        process.env.DB_USERNAME +
        ':' +
        process.env.DB_PASSWORD +
        '@' +
        process.env.DB_HOST +
        ':' +
        process.env.DB_PORT +
        '/payroll-engine?schema=public',
    })
    super({ adapter: pool })
  }
  async onModuleInit(): Promise<void> {
    await this.$connect()
  }

  enableShutdownHooks(app: INestApplication): void {
    this.$on('beforeExit' as never, () => {
      void app.close()
    })
  }
}
