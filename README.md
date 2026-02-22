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

### Deploying to Render

Render is configured as the production deployment platform with free tier support. The configuration is in `render.yaml`.

#### Prerequisites

1. **Render Account** - Create at [render.com](https://render.com)
2. **GitHub Repository** - Push code to GitHub (Render integrates directly)
3. **Environment Variables** - Set up JWT_SECRET and DATABASE_URL in Render dashboard

#### Quick Deployment Steps

1. **Connect GitHub Repository to Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New Web Service"
   - Select "Deploy an existing repository from GitHub"
   - Connect your GitHub account and select the `payroll-engine-server` repository

2. **Configure Service Settings**
   - **Name**: `payroll-engine-server`
   - **Runtime**: `Node`
   - **Plan**: `Free` (for portfolio/testing)
   - **Region**: Choose closest to you (e.g., `Oregon`, `Frankfurt`, `Singapore`)
   - **Branch**: `feature/tenant` (or your deployment branch)
   - **Build Command**: `bun install && bun run build`
   - **Start Command**: `bun run start:prod`

3. **Set Environment Variables**

   In the Render dashboard, add these environment variables:

   ```
   # Application
   NODE_ENV = production
   PORT = 3000
   JWT_SECRET = your-strong-jwt-secret-here

   # Database (Supabase connection details)
   DB_HOST = your-supabase-db-host
   DB_PORT = 5432
   DB_USERNAME = postgres
   DB_PASSWORD = your-supabase-db-password
   DB_NAME = your-database-name
   ```

4. **Create PostgreSQL Database (Using Supabase - Recommended)**
   - Sign up at [supabase.com](https://supabase.com) (free tier available)
   - Create a new project
   - Go to Project Settings → Database → Connection strings
   - Copy the connection details:
     - **Host**: Extract from connection string or find in Database settings
     - **Password**: Found in Database settings (your user password)
     - **Username**: `postgres` (default)
     - **Port**: `5432` (default)
   - Set these values in Render dashboard environment variables above

   **Alternative: Use Render's Free Database**
   - In Render Dashboard, click "New PostgreSQL"
   - Choose **Free** plan
   - Name: `payroll-db`
   - Database: `payroll_engine`
   - Region: Same as API service
   - Copy the generated connection details and set them as `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` environment variables above

5. **Setup GitHub Secrets (for CI/CD Database Migrations)**

   The GitHub Actions workflow needs database credentials to run migrations automatically. Set these at `github.com/yourrepo/settings/secrets/actions`:

   ```
   DB_HOST         your-supabase-or-render-db-host
   DB_PORT         5432
   DB_USERNAME     postgres
   DB_PASSWORD     your-database-password
   DB_NAME         payroll_engine
   ```

   These secrets will be used by the CI/CD pipeline to run `prisma migrate deploy` automatically during deployment.

6. **Deploy the Application**

   The deployment starts automatically after you connect the repository. Render will:
   - Build your application
   - Create the container
   - Deploy to production
   - Monitor health checks

   You can view deployment progress in the Render dashboard.

7. **Run Database Migrations on Production (First Time)**

   Option 1 - Using Render Shell:

   ```bash
   # In Render Dashboard → Your Service → Shell tab
   bun prisma migrate deploy
   # Optional: seed data
   bun seed
   ```

   Option 2 - Connect locally to production database:

   ```bash
   # Set environment variables to your production database
   export DB_HOST="your-db-host"
   export DB_PORT="5432"
   export DB_USERNAME="postgres"
   export DB_PASSWORD="your-db-password"
   export DB_NAME="payroll_engine"
   bun prisma migrate deploy
   bun seed
   ```

#### Post-Deployment Verification

1. Check service status:
   - View in Render Dashboard → Your Service

2. View recent logs:
   - Render Dashboard → Your Service → Logs tab

3. Test the API:

   ```bash
   curl https://<your-service-name>.onrender.com/health
   ```

4. Access Swagger documentation:
   ```
   https://<your-service-name>.onrender.com/docs
   ```

#### Deployment Configuration in render.yaml

The `render.yaml` file defines:

```yaml
services:
  - type: web # Web service
    name: payroll-engine-server # Service name
    runtime: node # Node.js runtime
    plan: free # Free tier
    buildCommand: bun install && bun run build
    startCommand: bun run start:prod
    envVars: # Environment variables
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        sync: false # Set manually in dashboard
      - key: DB_HOST
        sync: false # Supabase host
      - key: DB_PORT
        value: '5432'
      - key: DB_USERNAME
        value: postgres
      - key: DB_PASSWORD
        sync: false # Set manually in dashboard
      - key: PORT
        value: '3000'
```

**Note:** Database connection uses individual DB\_\* variables configured in Render dashboard.

#### Free Tier Limits & Considerations

**Free Plan Includes:**

- Shared CPU (reasonable for portfolio projects)
- 0.5 GB RAM
- 100 GB storage
- Automatic deploys from GitHub
- SSL/TLS certificate included
- Basic monitoring

**Database:** PostgreSQL is managed separately via Supabase (free tier available)

**Free Plan Limits:**

- Services spin down after 15 minutes of inactivity (cold start ~30 seconds)
- No custom domains (use `*.onrender.com`)
- Limited to 1 concurrent build

**For Better Performance (Upgrade When Needed):**

- Paid plans include always-on service (no cold starts)
- Custom domains
- Priority support

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

### Production Issues (Render)

#### Application Won't Start

Check the Render dashboard:

1. **View Logs** - Service → Logs tab
2. **Check Environment Variables** - Service → Environment tab
3. **Review Build Output** - Service → Events tab
4. **Test Database Connection**:
   ```bash
   # Use Render's shell to test connection
   psql -h <database-host> -U <user> -d <database>
   ```

#### Cold Start (Free Plan)

If your service takes 30+ seconds to respond:

- This is expected on the free tier (services sleep after 15 min inactivity)
- First request after sleep triggers a cold start
- **Solution**: Upgrade to a paid plan for always-on service

#### Database Migrations Failed

In Render Dashboard → Your Service → Shell:

```bash
# Check migration status
bun prisma migrate status

# Run migrations
bun prisma migrate deploy

# Seed data (optional)
bun seed
```

#### View and Tail Logs

```bash
# In Render Dashboard
Service → Logs tab (real-time streaming)

# Or from Render CLI (if installed)
render logs --service payroll-engine-server --tail
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
DB_NAME=payroll_engine

# Application
NODE_ENV=development
PORT=3000

# Security
JWT_SECRET=your_jwt_secret_here
```

### Production (Render)

Set these in Render Dashboard → Service → Environment:

```env
# Database (Supabase)
DB_HOST=your-supabase-db-host
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-supabase-password
DB_NAME=payroll_engine

# Application
NODE_ENV=production
PORT=3000

# Security
JWT_SECRET=strong-random-string
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
- Load balancing (Render handles this)
- Database backups and monitoring

## Monitoring & Logs

### Local Development

```bash
# View all logs
docker compose logs -f api

# View only database logs
docker compose logs -f db
```

### Production (Render)

```bash
# View logs in Render Dashboard
# Service → Logs tab (real-time streaming)

# Or using Render CLI:
render logs --service payroll-engine-server --tail
render logs --service payroll-engine-server --limit 100
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
- **Render** - https://render.com/docs
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
