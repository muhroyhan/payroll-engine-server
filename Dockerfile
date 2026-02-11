FROM node:22.14.0-bullseye-slim@sha256:73a9dfbb6c761aebdf4666cce2627635a30d1d4c20f67ff642d01b8f09e709a3 AS builder
WORKDIR /opt/app
COPY package.json bun.lock tsconfig.json tsconfig.build.json ./
RUN corepack enable
RUN bun install --frozen-lockfile
RUN bun run build

FROM builder AS runner
WORKDIR /opt/app
COPY --from=builder /opt/app/dist ./dist
COPY --from=builder /opt/app/node_modules ./node_modules