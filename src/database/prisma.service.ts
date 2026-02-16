import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prismaclient/client'
import { PrismaPg } from '@prisma/adapter-pg'

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const adapter = new PrismaPg(
      {
        database: '/payroll-engine',
        host: process.env.DB_HOST,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USERNAME,
      },
      { schema: 'public' },
    )
    super({ adapter })
  }
}
