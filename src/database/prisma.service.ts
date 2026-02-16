import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prismaclient/client'
import { PrismaPg } from '@prisma/adapter-pg'

@Injectable()
export class PrismaService extends PrismaClient {
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
}
