/**
 * Builds the PostgreSQL connection URL from individual environment variables.
 * Single source of truth used by prisma.config.ts, seed.ts, and PrismaService.
 */
export function buildDatabaseUrl(): string {
  const { DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env
  return `postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public`
}
