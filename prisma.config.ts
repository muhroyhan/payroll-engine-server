import 'dotenv/config'
import { defineConfig } from 'prisma/config'
import { buildDatabaseUrl } from './src/database/database-url'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'prisma/seed.ts',
  },
  datasource: {
    url: buildDatabaseUrl(),
  },
})
