# =============================================================================
# Stage 1 — Builder
# Install all dependencies, compile TypeScript, and resolve path aliases.
# bun install works without a lockfile — no package-lock.json needed.
# =============================================================================
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy manifest only — bun resolves deps from package.json directly
COPY package.json ./
RUN bun install

# Copy source code (including pre-generated prisma/client/)
COPY . .

# Compile TypeScript + rewrite path aliases via tsc-alias
# bun run executes the npm script using the locally installed NestJS CLI
RUN bun run build

# =============================================================================
# Stage 2 — Production
# Lean image with only production dependencies and the compiled output.
# =============================================================================
FROM oven/bun:1-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies only — no lockfile required
COPY package.json ./
RUN bun install --production

# Copy compiled application
COPY --from=builder /app/dist ./dist

# Copy Prisma custom-generated client (output = "client" in schema.prisma).
# tsc-alias rewrites @prismaclient/* imports to relative paths that point here.
COPY --from=builder /app/prisma/client ./prisma/client

# Copy Prisma schema for runtime migration / introspection (optional but safe)
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma

EXPOSE 3000

CMD ["node", "dist/main"]
