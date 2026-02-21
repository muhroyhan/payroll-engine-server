# Payroll Engine Server

A scalable, maintainable payroll management system built with NestJS, PostgreSQL, and Prisma.

## Table of Contents

- [Local Development Setup](#local-development-setup)
- [Running the Application](#running-the-application)
- [Available Commands](#available-commands)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Database Management](#database-management)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Local Development Setup

### Prerequisites

Before starting, ensure you have the following installed on your machine:

- **Node.js** (version 18 or higher) - [Download](https://nodejs.org/)
- **bun** (package manager) - Install with: `curl -fsSL https://bun.sh/install | bash`
- **Docker** - [Download](https://www.docker.com/products/docker-desktop)
- **Docker Compose** - Usually comes with Docker Desktop
- **Git** - [Download](https://git-scm.com/)

### Quick Start (3 Steps!)

1. **Clone and install**

   ```bash
   git clone <repository-url>
   cd payroll-engine-server
   bun install
   ```

2. **Setup environment**

   ```bash
   cp .env.example .env
   ```

3. **Start everything**
   ```bash
   bun start
   ```

That's it! This command starts the PostgreSQL database and API server together. The API will be available at `http://localhost:3000` with hot-reload enabled.

### Environment Variables

Edit `.env` to customize (optional):

```env
DB_HOST=localhost              # PostgreSQL host
DB_PORT=5432                   # PostgreSQL port
DB_USERNAME=postgres           # PostgreSQL user
DB_PASSWORD=your_password_here # PostgreSQL password
JWT_SECRET=your_jwt_secret_here # Secret for JWT tokens
NODE_ENV=development            # Environment type
PORT=3000                       # API server port
```

## Running the Application

### Development Mode (Default)

```bash
bun start
```

- Starts both database and API server via Docker Compose
- API runs on `http://localhost:3000` with hot-reload enabled
- Database automatically seeded with initial data

### Development with Code Reloading

For development without Docker (after database is running):

```bash
bun start:dev
```

- Starts only the NestJS server with file watching
- Requires database to be running separately

### Debug Mode

```bash
bun start:debug
```

- Starts the server with debugger support
- Useful for troubleshooting issues

### Production Build

```bash
# Build the application
bun build

# Start the production server
bun start:prod
```

## Available Commands

### Main Development Commands

| Command           | Description                                                |
| ----------------- | ---------------------------------------------------------- |
| `bun start`       | **Start API server + database** (recommended) ⭐           |
| `bun start:dev`   | Start only API server with hot-reload (db must be running) |
| `bun start:debug` | Start with debugger enabled                                |
| `bun build`       | Compile TypeScript for production                          |
| `bun start:prod`  | Run production build                                       |

### Database & Prisma

| Command                     | Description                                  |
| --------------------------- | -------------------------------------------- |
| `bun run seed`              | Seed database with initial data              |
| `bun prisma migrate dev`    | Create and apply database migration          |
| `bun prisma migrate status` | View migration status                        |
| `bun prisma studio`         | Open Prisma Studio (visual database browser) |
| `bun prisma generate`       | Generate Prisma Client                       |

### Testing & Quality

| Command          | Description               |
| ---------------- | ------------------------- |
| `bun test`       | Run unit tests            |
| `bun test:watch` | Run tests in watch mode   |
| `bun test:cov`   | Generate coverage report  |
| `bun test:e2e`   | Run end-to-end tests      |
| `bun lint`       | Run ESLint and fix issues |
| `bun format`     | Format code with Prettier |

## Project Structure

The project follows a layered architecture with clear separation of concerns:

```
src/
├── common/          # Shared utilities and cross-cutting concerns
│   ├── decorators/     # Custom decorators (auth, roles, etc.)
│   ├── exceptions/     # Custom exception classes
│   ├── filters/        # Global exception filter
│   ├── guards/         # Authentication & authorization guards
│   ├── pipes/          # Validation pipes
│   └── types/          # Shared TypeScript types
├── database/        # Database configuration
│   ├── prisma.service.ts   # Prisma service wrapper
│   ├── prisma.module.ts    # Prisma module
│   └── database-url.ts     # Database URL configuration
├── modules/         # Feature modules (Application layer)
│   ├── auth/           # Authentication module
│   │   ├── controllers/  # Auth endpoints
│   │   ├── services/     # Auth business logic
│   │   ├── guards/       # JWT guards, throttle guards
│   │   ├── strategies/   # Passport strategies
│   │   └── dto/          # Data Transfer Objects
│   └── ... # Other modules
├── app.module.ts    # Root NestJS module
└── main.ts          # Application entry point
```

**Database Layer (Prisma)**

```
prisma/
├── schema.prisma      # Database schema definition
├── seed.ts            # Seeding script for initial data
└── migrations/        # Migration history
    └── 20260219045435_init/
```

For detailed architecture information, see [docs/architecture.md](./docs/architecture.md)

## Architecture

### Layers

1. **Common Layer** - Shared utilities, exceptions, guards, decorators
2. **Database Layer** - Prisma ORM and database abstractions
3. **Application Layer** - Feature modules handling HTTP requests

### Dependency Flow

Layers can only import from layers below them, preventing circular dependencies:

```
Application (Modules)
    ↓
Database (Prisma)
    ↓
Common (Utilities & Exceptions)
```

### Module Structure

Each feature module follows a consistent structure:

```
modules/employee/
├── controllers/       # HTTP endpoints (routes)
├── services/          # Business logic and validation
├── dto/               # Data Transfer Objects (request/response)
├── types/             # TypeScript interfaces/types
├── entities/          # Domain entities (if DDD pattern used)
└── employee.module.ts # Module declaration
```

## Database Management

### Schema Overview

The project uses PostgreSQL with Prisma ORM. Key entities:

| Entity                      | Purpose                                    |
| --------------------------- | ------------------------------------------ |
| **User**                    | System users with roles and authentication |
| **Tenant**                  | Multi-tenant organization support          |
| **Employee**                | Employee information and records           |
| **SalaryComponent**         | Reusable salary structure components       |
| **EmployeeSalaryComponent** | Employee-specific salary components        |
| **PayslipRun**              | Batch payroll processing runs              |
| **Payslip**                 | Generated payslips for employees           |
| **PayslipItem**             | Individual line items in payslips          |
| **AuditLogs**               | Audit trail of system changes              |

### Viewing Database

Open Prisma Studio (visual database browser):

```bash
bun prisma studio
```

This opens http://localhost:5173 with a UI to browse and edit data.

### Creating Migrations

After modifying `prisma/schema.prisma`:

```bash
# Create a new migration
bun prisma migrate dev --name add_new_field

# Check migration status
bun prisma migrate status

# Reset database (development only!)
bun prisma migrate reset
```

## API Documentation

The API uses JWT authentication and is documented with Swagger/OpenAPI.

**Access API Documentation**: `http://localhost:3000/docs` (when running locally)

### Authentication Flow

#### 1. Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "tenant_admin"
  }
}
```

#### 2. Use Access Token in Requests

```http
GET /employees
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 3. Refresh Token When Expired

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Common Endpoints

| Method   | Endpoint         | Description          |
| -------- | ---------------- | -------------------- |
| `POST`   | `/auth/login`    | User login           |
| `POST`   | `/auth/refresh`  | Refresh access token |
| `GET`    | `/employees`     | List employees       |
| `POST`   | `/employees`     | Create employee      |
| `GET`    | `/employees/:id` | Get employee details |
| `PATCH`  | `/employees/:id` | Update employee      |
| `DELETE` | `/employees/:id` | Delete employee      |

## Testing

### Unit Tests

```bash
# Run all tests
bun test

# Run in watch mode
bun test:watch

# Generate coverage report
bun test:cov

# Run specific test file
bun test src/modules/auth/auth.service.spec.ts
```

### E2E Tests

```bash
# Run end-to-end tests
bun test:e2e

# Run specific E2E test
bun test:e2e -- auth.e2e-spec
```

## Deployment

### Deploying to Fly.io

Fly.io is configured as the production deployment platform. The configuration is in `fly.toml`.

#### Prerequisites

1. **Fly CLI** - Install from [fly.io/docs](https://fly.io/docs/getting-started/installing-flyctl/)
2. **Fly Account** - Create at [fly.io](https://fly.io)
3. **PostgreSQL Database** - Set up on Fly.io or use external provider

#### Deployment Steps

1. **Authenticate with Fly**

   ```bash
   flyctl auth login
   ```

2. **Set Environment Variables**

   ```bash
   # Set production secrets
   flyctl secrets set \
     JWT_SECRET="your-strong-jwt-secret" \
     DB_HOST="your-db-host" \
     DB_PORT="5432" \
     DB_USERNAME="postgres" \
     DB_PASSWORD="your-db-password" \
     NODE_ENV="production"
   ```

3. **Create PostgreSQL Database (if needed)**

   ```bash
   # Create new Postgres database on Fly.io
   flyctl postgres create

   # Or use external database - just set DB_* environment variables
   ```

4. **Update Database URL in fly.toml**

   If using external database, ensure the connection string is correct:

   ```toml
   [env]
     DATABASE_URL = "postgresql://user:password@host:port/database"
   ```

5. **Deploy the Application**

   ```bash
   # Deploy to production
   flyctl deploy

   # Monitor deployment
   flyctl status

   # View logs
   flyctl logs
   ```

6. **Run Database Migrations on Production**

   ```bash
   # SSH into the app machine
   flyctl ssh console

   # Run migrations
   bun prisma migrate deploy

   # Seed data (optional)
   bun seed

   # Exit
   exit
   ```

#### Post-Deployment Verification

1. Check app status:

   ```bash
   flyctl status
   ```

2. View recent logs:

   ```bash
   flyctl logs -n 50
   ```

3. Test the API:

   ```bash
   curl https://<app-name>.fly.dev/health
   ```

4. Access Swagger documentation:
   ```
   https://<app-name>.fly.dev/docs
   ```

#### Deployment Configuration Explained

The `fly.toml` file contains:

```toml
app = 'payroll-engine-server'              # App name on Fly.io
primary_region = 'sin'                     # Singapore region (adjust as needed)

[env]
  NODE_ENV = 'production'                  # Production environment
  PORT = '3000'                            # Internal port

[http_service]
  internal_port = 3000                     # Port inside container
  force_https = true                       # HTTPS enforced
  auto_stop_machines = 'stop'              # Stop idle machines
  auto_start_machines = true               # Restart on demand
  min_machines_running = 0                 # Scale to 0 when idle

[[vm]]
  size = 'shared-cpu-1x'                   # Machine size (adjust for production)
```

**Regions Available**: `syd` (Sydney), `sin` (Singapore), `sjc` (San Jose), `ams` (Amsterdam), etc.

**VM Sizes**: `shared-cpu-1x` (small), `performance-1x` (medium), `performance-2x` (large)

### Alternative Deployment Options

#### Docker Deployment

The project includes Docker configuration for deployment:

```bash
# Build Docker image
docker build -t payroll-engine:latest .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  payroll-engine:latest
```

#### Traditional Server (VPS/Cloud VM)

1. Install Node.js 18+ and PostgreSQL
2. Clone repository
3. Configure `.env` with production values
4. Run: `bun install && bun build && bun start:prod`
5. Use PM2 for process management: `pm2 start dist/main.js`

## Troubleshooting

### Local Development Issues

#### Database Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**

```bash
# Check if database is running
docker compose ps

# Start database
docker compose up -d

# Verify connection
docker compose exec db psql -U postgres -c "SELECT 1"
```

#### Port Already in Use

```
Error: Port 3000 is already in use
```

**Solution:**

```bash
# Option 1: Change port in .env
echo "PORT=3001" >> .env

# Option 2: Kill process using port 3000
Get-NetstatTCP | Where-Object {$_.LocalPort -eq 3000} | Stop-Process
```

#### Module Not Found / Path Errors

```
Error: Cannot find module '@src/...'
```

**Solution:**

```bash
# Verify tsconfig.json has correct path aliases
# Check import statements use correct syntax

# Regenerate Prisma client
bun prisma generate
```

#### Hot Reload Not Working

```bash
# Restart development server
# Ensure volumes are correctly mounted in docker-compose.yaml
docker compose restart api
```

### Migration Issues

#### Migration History Out of Sync

```bash
# Check migration status
bun prisma migrate status

# Resolve conflicts (reset in development only!)
bun prisma migrate reset
```

#### Database Drift Detected

```bash
# Align schema with database
bun prisma db pull

# Review and apply changes
bun prisma migrate dev
```

### Production Issues

#### Application Won't Start

```bash
# Check logs
flyctl logs -n 100

# Check environment variables
flyctl secrets list

# Verify database connection
flyctl ssh console  # Then test connection
```

#### Database Migrations Failed

```bash
# SSH into app
flyctl ssh console

# Check migration status
bun prisma migrate status

# Run migrations
bun prisma migrate deploy
```

## Code Quality & Best Practices

### Linting

```bash
# Check for errors
bun lint

# Auto-fix issues
bun lint --fix
```

### Code Formatting

```bash
# Format all code with Prettier
bun format

# Check formatting
bun format --check
```

### Pre-commit Hooks (Recommended)

Install Husky for automatic quality checks:

```bash
bun add -D husky lint-staged
bunx husky install
```

### Code Review Checklist

- ✅ Code follows NestJS module structure
- ✅ No circular dependencies between modules
- ✅ Custom exceptions used appropriately
- ✅ DTOs used for all API inputs
- ✅ Tests written for new features
- ✅ ESLint passes with no warnings
- ✅ No hardcoded secrets or credentials
- ✅ Environment variables documented
- ✅ Documentation updated

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes and test
bun test
bun lint

# 3. Commit with clear message
git commit -m "feat: add new feature"

# 4. Push and create Pull Request
git push origin feature/my-feature
```

## Environment Variables Reference

### Local Development

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password_here

# Application
NODE_ENV=development
PORT=3000

# Security
JWT_SECRET=your_jwt_secret_here
```

### Production (Fly.io)

Set these using `flyctl secrets set`:

```
JWT_SECRET=strong-random-string
DB_HOST=your-db-host
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=secure-password
NODE_ENV=production
```

## Performance Optimization

### Current Optimizations

- Connection pooling with Prisma
- Input validation at request level
- Global exception handling
- JWT token-based authentication

### Recommended for Production

- Redis caching for frequently accessed data
- Database query optimization and indexing
- API rate limiting (throttle guard implemented)
- Response compression
- Load balancing (Fly.io handles this)
- Database backups and monitoring

## Monitoring & Logs

### Local Development

```bash
# View all logs
docker compose logs -f api

# View only database logs
docker compose logs -f db
```

### Production (Fly.io)

```bash
# Real-time logs
flyctl logs

# Last 100 log messages
flyctl logs -n 100

# Stream specific region
flyctl logs -f
```

## Contributing

### Code Guidelines

1. Follow NestJS architecture best practices
2. Keep modules focused and single-responsibility
3. Use TypeScript strict mode
4. Write tests for new features
5. Document complex business logic
6. Use dependency injection

### Creating New Features

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Generate NestJS module
nest g module modules/my-feature

# 3. Generate controller
nest g controller modules/my-feature/controllers

# 4. Generate service
nest g service modules/my-feature/services

# 5. Write tests and code
# 6. Test locally
bun test

# 7. Format and lint
bun format && bun lint --fix

# 8. Push and create PR
```

## Essential Resources

- **NestJS** - https://docs.nestjs.com
- **Prisma** - https://www.prisma.io/docs
- **PostgreSQL** - https://www.postgresql.org/docs
- **Fly.io** - https://fly.io/docs
- **TypeScript** - https://www.typescriptlang.org/docs
- **JWT** - https://jwt.io/introduction
- **bun** - https://bun.sh/docs

## Support & Issues

- 📧 Contact development team for support
- 🐛 Report bugs via GitHub Issues
- 📖 Check documentation in `/docs` folder
- 💬 Discuss features in Pull Requests

## License

UNLICENSED - Internal project only

---

**Last Updated:** February 21, 2026  
**Maintained by:** Development Team
