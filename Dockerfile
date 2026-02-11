FROM oven/bun:latest AS builder
WORKDIR /opt/app
COPY package.json bun.lock tsconfig.json tsconfig.build.json ./
RUN bun install --frozen-lockfile
RUN bun run build

FROM builder AS runner
WORKDIR /opt/app
COPY --from=builder /opt/app/dist ./dist
COPY --from=builder /opt/app/node_modules ./node_modules