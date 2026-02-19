# Code Architecture

## Overview

This is a **NestJS** REST API server built with:

| Layer         | Technology                                 |
| ------------- | ------------------------------------------ |
| Framework     | NestJS 11 (modular, DI-based)              |
| HTTP Adapter  | Fastify (replaces Express for performance) |
| ORM           | Prisma 7 with `@prisma/adapter-pg`         |
| Database      | PostgreSQL 17                              |
| Auth          | Passport.js + JWT (HS256)                  |
| Validation    | class-validator + class-transformer        |
| Documentation | Swagger (dev only, at `/docs`)             |
| Runtime       | Node.js 22 / Bun                           |
| Container     | Docker + Docker Compose                    |

---

## Module Structure

```
AppModule (root)
│
├── ConfigModule (global)       — env vars accessible everywhere
├── ThrottlerModule (global)    — global 100 req/min rate limit
│
└── AuthModule
    ├── PrismaModule            — database access
    ├── JwtModule               — token sign/verify
    ├── PassportModule          — auth strategy runner
    ├── AuthController          — HTTP endpoints
    ├── AuthService             — business logic
    ├── JwtStrategy             — Passport JWT validation
    ├── JwtAuthGuard            — applied globally (APP_GUARD)
    └── EmailThrottlerGuard     — per-endpoint, email-based fail limiter
```

---

## Global Providers (registered in `AppModule`)

| Provider                | Type       | Purpose                                                     |
| ----------------------- | ---------- | ----------------------------------------------------------- |
| `GlobalExceptionFilter` | APP_FILTER | Catches all unhandled exceptions, normalizes error response |
| `ValidationPipe`        | APP_PIPE   | Validates and transforms request bodies via DTOs            |
| `ThrottlerGuard`        | APP_GUARD  | Enforces global rate limit (100/60s)                        |
| `JwtAuthGuard`          | APP_GUARD  | Protects all routes with JWT by default                     |

The `JwtAuthGuard` is global — **all routes require authentication unless decorated with `@Public()`**.

---

## Request Lifecycle

```
HTTP Request
     │
     ▼
Fastify HTTP adapter
     │
     ▼
Global Rate Limiter (ThrottlerGuard)   — 100 req/min global
     │
     ▼
Global JWT Guard (JwtAuthGuard)        — validate Bearer token
│    │
│    └── @Public() route? → skip JWT check
│
▼
Route-level Guards (e.g. EmailThrottlerGuard on POST /auth/login)
     │
     ▼
Global Validation Pipe                 — validate & transform request body via DTO
     │
     ▼
Controller method
     │
     ▼
Service layer                          — business logic + Prisma queries
     │
     ▼
Response
     │
     ▼ (on error anywhere above)
GlobalExceptionFilter                  — formats error into { code, message, ... }
```

---

## Authentication Architecture

### Role-Based Authorization

Three roles exist: `tenant_admin`, `payroll_officer`, `viewer` (defined as the `Role` union type in `src/common/types/role.type.ts`).

The `RolesGuard` (`src/common/guards/roles.guard.ts`) reads roles from the `@Roles()` decorator and compares against `request.user.role`. It is **not** registered globally — apply it per controller or route:

```typescript
@UseGuards(RolesGuard)
@Controller('employees')
export class EmployeeController {
  @Roles('tenant_admin', 'payroll_officer')
  @Post()
  create() { ... }

  @Roles('tenant_admin', 'payroll_officer', 'viewer')
  @Get()
  findAll() { ... }
}
```

`JwtAuthGuard` (global) runs **before** `RolesGuard` — the JWT must be valid before roles are checked.

---

### JWT Strategy

- Tokens extracted from `Authorization: Bearer <token>` header
- Validated with `JwtStrategy` (Passport): checks signature + expiry
- On success, `validate()` returns an `AuthUser` object attached to `request.user`
- `AuthUser` contains: `userId`, `email`, `role`, `tenantId`

### Token Pair Design

- **Access token** — short-lived (15 min), used for API calls
- **Refresh token** — long-lived (7 days), used only to issue a new token pair
- Refresh token is **stored as a SHA-256 hex digest** in `User.refreshToken` — the plain token is only sent to the client once
- Refresh tokens include a `jti: randomUUID()` claim to guarantee uniqueness for rotation detection
- SHA-256 is used (not bcrypt) because bcrypt silently truncates input at 72 bytes — JWTs are ~200+ bytes and share a long common prefix, making bcrypt-based comparison unreliable for token rotation

### Rate Limiting — Two Layers

1. **Global throttler** (`@nestjs/throttler`) — 100 requests per 60 seconds per IP, applied to all routes
2. **Email-based throttler** (`EmailThrottlerGuard`) — 5 **failed** login attempts per 15 minutes per email address; applied only to `POST /auth/login`. Successful logins reset the counter.

> **Implementation note:** `failedAttemptsStore` is declared as a **module-level constant** (outside the class) so that the Map is shared across all instances of `EmailThrottlerGuard`. This is required because NestJS DI creates a separate instance when `@UseGuards(EmailThrottlerGuard)` is used on a controller vs when it is injected into a service.

---

## Multi-Tenancy

Every resource (Employee, SalaryComponent, Payslip, etc.) holds a `tenantId` foreign key.  
All queries must be scoped by `tenantId` to prevent cross-tenant data leaks.  
The `tenantId` is embedded in the JWT payload and extracted from `@CurrentUser()` in controllers.

---

## Data Layer

### PrismaService

`PrismaService` extends `PrismaClient` and is provided by `PrismaModule`. It uses the `@prisma/adapter-pg` driver for a managed connection pool.

### Connection URL

The DB connection string is built once in `src/database/database-url.ts` via `buildDatabaseUrl()` and imported by:

- `PrismaService` (runtime)
- `prisma.config.ts` (migrations/CLI)
- `prisma/seed.ts` (seeding)

---

## Error Handling

All exceptions flow through `GlobalExceptionFilter`. The standard error response shape is:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [...],
  "statusCode": 422,
  "timestamp": "2026-02-19T05:00:00.000Z",
  "path": "/v1/auth/login"
}
```

Custom exception classes in `src/common/exceptions/`:

- `BaseException`
- `BusinessLogicException`
- `ForbiddenException`
- `NotFoundException`
- `UnauthorizedException`
- `ValidationException`

---

## Naming Conventions

| Thing         | Convention           | Example                           |
| ------------- | -------------------- | --------------------------------- |
| Files         | kebab-case           | `auth.service.ts`                 |
| Classes       | PascalCase           | `AuthService`                     |
| Methods/vars  | camelCase            | `validateUser()`                  |
| DB columns    | camelCase (Prisma)   | `tenantId`, `isActive`            |
| Enums values  | snake_case           | `tenant_admin`, `payroll_officer` |
| HTTP routes   | kebab-case           | `/auth/login`, `/payslip-items`   |
| Env variables | SCREAMING_SNAKE_CASE | `JWT_SECRET`, `DB_HOST`           |

---

## Environment Variables

| Variable      | Description                    |
| ------------- | ------------------------------ |
| `DB_HOST`     | PostgreSQL host                |
| `DB_PORT`     | PostgreSQL port (default 5432) |
| `DB_USERNAME` | PostgreSQL username            |
| `DB_PASSWORD` | PostgreSQL password            |
| `JWT_SECRET`  | Secret for signing JWT tokens  |
| `PORT`        | API server port (default 3000) |
| `NODE_ENV`    | `development` / `production`   |

---

## Development Scripts

| Script          | Command                       | Description                                          |
| --------------- | ----------------------------- | ---------------------------------------------------- |
| `bun start`     | `docker compose up --build`   | Start API + DB in Docker                             |
| `bun start:dev` | `nest start --watch`          | Run NestJS locally with hot reload                   |
| `bun build`     | `nest build && tsc-alias`     | Compile TypeScript + rewrite path aliases in `dist/` |
| `bun seed`      | `tsx prisma/seed.ts`          | Seed database with default tenant + admin            |
| `bun test`      | `jest`                        | Unit tests                                           |
| `bun test:e2e`  | `jest --config jest-e2e.json` | E2E tests                                            |
| `bun lint`      | `eslint ... --fix`            | Lint and auto-fix                                    |
