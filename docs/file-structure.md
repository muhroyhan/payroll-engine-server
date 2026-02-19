# File & Folder Structure

## Root Directory

```
payroll-engine-server/
├── src/                        # Application source code
├── prisma/                     # Database schema, migrations, seed
├── docs/                       # Project documentation
├── test/                       # Test files
├── Dockerfile.dev              # Docker image for development (hot reload)
├── compose.yaml                # Docker Compose for dev environment (api + db)
├── nest-cli.json               # NestJS CLI configuration
├── prisma.config.ts            # Prisma config (schema path, migrations, DB URL)
├── tsconfig.json               # TypeScript base config
├── tsconfig.build.json         # TypeScript build config (excludes tests)
├── eslint.config.mjs           # ESLint configuration
├── package.json                # Dependencies and scripts
├── bun.lock                    # Bun lockfile
├── .env                        # Local environment variables (not committed)
└── .env.example                # Template for required environment variables
```

---

## `src/` — Application Source

```
src/
├── main.ts                     # App entry point: bootstraps Fastify, registers plugins
├── app.module.ts               # Root module: wires global config, guards, pipes, filters
├── constants.ts                # (reserved — no active exports)
│
├── common/                     # Shared utilities used across all modules
│   ├── decorators/
│   │   ├── current-user.decorator.ts   # @CurrentUser() — extracts user from JWT context
│   │   ├── public.decorator.ts         # @Public() — marks route as unauthenticated
│   │   └── roles.decorator.ts          # @Roles(...roles) — sets required roles metadata on a route
│   ├── dto/                    # Shared DTOs (if any)
│   ├── exceptions/             # Custom typed exceptions
│   │   ├── base.exception.ts
│   │   ├── business-logic.exception.ts
│   │   ├── forbidden.exception.ts
│   │   ├── not-found.exception.ts
│   │   ├── unauthorized.exception.ts
│   │   ├── validation.exception.ts     # Throws HTTP 422 Unprocessable Entity
│   │   └── index.ts
│   ├── filters/
│   │   ├── global-exception.filter.ts  # Catches all exceptions, formats error response
│   │   └── index.ts
│   ├── guards/
│   │   └── roles.guard.ts              # RolesGuard — checks @Roles() metadata against request.user.role
│   ├── interceptors/           # (reserved for future interceptors)
│   ├── middleware/             # (reserved for future middleware)
│   ├── pipes/
│   │   ├── validation.pipe.ts          # Global validation pipe (whitelist, transform, throws 422)
│   │   └── index.ts
│   ├── types/
│   │   ├── auth-user.type.ts   # AuthUser — user object attached to request after JWT validation
│   │   └── role.type.ts        # Role — union type: 'tenant_admin' | 'payroll_officer' | 'viewer'
│   └── utils/                  # (reserved for future utilities)
│
├── database/
│   ├── database-url.ts         # buildDatabaseUrl() — single source of truth for DB connection string
│   ├── prisma.module.ts        # PrismaModule — exports PrismaService globally
│   └── prisma.service.ts       # PrismaService — extends PrismaClient, handles connect/disconnect
│
├── interfaces/                 # (reserved for typed HTTP request/response contracts)
│   ├── events/
│   └── http/
│       ├── requests/
│       └── responses/
│
└── modules/
    └── auth/                   # Auth feature module
        ├── auth.config.ts      # AUTH_CONFIG: JWT expiry, bcrypt rounds, throttle limits
        ├── auth.module.ts      # AuthModule wiring
        ├── controllers/
        │   ├── auth.controller.ts      # POST /auth/login, /auth/refresh, /auth/logout, GET /auth/me
        │   └── index.ts
        ├── decorators/
        │   └── throttle-by-email.decorator.ts  # @ThrottleByEmail() metadata decorator
        ├── dto/
        │   ├── login.dto.ts            # { email, password }
        │   └── refresh.dto.ts          # { refreshToken }
        ├── guards/
        │   ├── email-throttler.guard.ts    # Per-email failed login rate limiter (5 fails / 15min)
        │   └── jwt-auth.guard.ts           # Global JWT guard — skips @Public() routes
        ├── services/
        │   ├── auth.service.ts         # Core auth logic: validate, login, refresh, logout
        │   └── index.ts
        ├── strategies/
        │   └── jwt.strategy.ts         # Passport JWT strategy — validates Bearer token
        └── types/
            ├── jwt-payload.type.ts     # JWT payload shape { sub, email, role, tenantId } + jti (refresh only)
            └── login-response.type.ts  # LoginResponse & SafeUser shapes
```

---

## `prisma/` — Database

```
prisma/
├── schema.prisma               # Prisma schema: models, enums, indexes
├── prisma.config.ts            # Prisma config (pointed to via prisma.config.ts at root)
├── seed.ts                     # Seed script — creates default tenant + admin user
├── client/                     # Generated Prisma client (auto-generated, do not edit)
│   ├── client.ts
│   ├── models.ts
│   ├── enums.ts
│   ├── models/                 # Per-model type files
│   └── internal/
└── migrations/
    └── 20260219xxxxxx_init/
        └── migration.sql       # Single squashed migration (all tables + indexes)
```

---

## `test/` — Tests

```
test/
├── e2e/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── integration/                # (reserved)
└── unit/                       # (reserved)
```

---

## `docs/` — Documentation

```
docs/
├── database.md                 # Database tables, fields, indexes, enums, ERD
├── file-structure.md           # This file
├── architecture.md             # Code architecture, design patterns, request lifecycle
└── auth-flow.md                # Login, logout, token refresh flow
```
