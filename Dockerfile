FROM node:24.13.1-trixie-slim AS development
WORKDIR /opt/app
RUN npm i -g bun
RUN npm i -g prisma
COPY package.json bun.lock tsconfig.json tsconfig.build.json prisma/seed.ts ./
RUN bun install
RUN prisma generate