FROM node:24.13.1-trixie-slim AS development
WORKDIR /opt/app
RUN npm i -g bun
COPY package.json bun.lock tsconfig.json tsconfig.build.json ./
RUN bun install