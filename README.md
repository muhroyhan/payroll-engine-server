# Payroll Engine Server

A scalable, maintainable payroll management system built with NestJS, PostgreSQL, and Prisma.

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- bun (package manager)

### Installation

```bash
# Install dependencies
bun install

# Setup environment variables
cp .env.example .env

# Start database
docker compose up -d

# Run migrations
bun prisma migrate dev

# Seed database (optional)
bun seed

# Start development server
bun start:dev
```

### Available Scripts

```bash
# Development
bun start:dev           # Start with hot reload
bun start:debug         # Start with debugger

# Production
bun build              # Build for production
bun start:prod         # Run production build

# Database
bun prisma migrate dev # Create migration
bun prisma studio     # Open Prisma Studio
bun seed              # Seed database

# Testing
bun test              # Run unit tests
bun test:watch        # Run tests in watch mode
bun test:cov          # Generate coverage report
bun test:e2e          # Run E2E tests

# Code Quality
bun lint              # Run ESLint
bun format            # Format with Prettier
```

## Project Structure

The project follows a layered architecture with clear separation of concerns:

```
src/
├── common/          # Shared utilities and cross-cutting concerns
├── config/          # Configuration management
├── database/        # Database abstractions
├── domain/          # Core business logic (Domain-Driven Design)
├── infra/           # Infrastructure services
├── modules/         # Feature modules (Application layer)
└── app.module.ts    # Root module
```

For detailed information, see [docs/architecture.md](./docs/architecture.md)

## Architecture

### Layers

1. **Common Layer** - Shared utilities, exceptions, guards, decorators
2. **Config Layer** - Environment configuration management
3. **Database Layer** - Prisma ORM and database abstractions
4. **Domain Layer** - Core business logic and entities (DDD)
5. **Infrastructure Layer** - Logging, queues, file storage
6. **Application Layer** - Feature modules handling HTTP requests

### Dependency Flow

Each layer can only import from layers below it, preventing circular dependencies:

```
Application (Modules)
    ↓
Domain (Business Logic)
    ↓
Infrastructure (Services)
    ↓
Common (Utilities)
```

### Module Structure

Each feature module follows a standard structure for consistency:

```
modules/employee/
├── controllers/     # HTTP endpoints
├── services/        # Business logic
├── dto/             # Data transfer objects
├── types/           # TypeScript types
└── employee.module.ts
```

For detailed module guidelines, see [docs/module-structure.md](./docs/module-structure.md)

## Features

### ✅ Implemented

- User authentication with JWT
- Role-based access control (RBAC)
- Employee management
- Salary component configuration
- Payroll calculation
- Payslip generation
- Audit logging
- Database migrations with Prisma
- Comprehensive error handling
- Input validation with class-validator

### 🚀 Future Features

- Payroll rule engine
- Complex tax calculations
- Deduction management
- Leave management
- API versioning
- GraphQL support
- Webhooks integration

## Database

### Schema

The project uses Prisma with PostgreSQL. Key entities:

- **User** - System users with roles
- **Tenant** - Multi-tenant support
- **Employee** - Employee information
- **SalaryComponent** - Salary structure components
- **Payroll** - Payroll calculations
- **Payslip** - Generated payslips
- **AuditLogs** - Transaction audit trail

### Migrations

```bash
# Create new migration after schema changes
bun prisma migrate dev --name describe_your_change

# View database in UI
bun prisma studio
```

## API Documentation

### Authentication

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "accessToken": "jwt_token",
  "refreshToken": "jwt_token",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

#### Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "jwt_token"
}
```

### Employees

All employee endpoints require authentication.

```http
GET    /employees           # List all employees
POST   /employees           # Create employee
GET    /employees/:id       # Get employee details
PATCH  /employees/:id       # Update employee
DELETE /employees/:id       # Delete employee
```

### Payroll

```http
POST   /payroll            # Calculate payroll
GET    /payroll/:id        # Get payroll details
GET    /payroll/tenant/:id # Get tenant's payrolls
```

For full API documentation, check Swagger at `http://localhost:3000/api`

## Testing

### Unit Tests

```bash
# Run all unit tests
bun test

# Run specific test file
bun test src/modules/auth/auth.service.spec.ts

# Watch mode
bun test:watch

# Coverage
bun test:cov
```

### E2E Tests

```bash
# Run E2E tests
bun test:e2e

# Only specific test
bun test:e2e -- auth.e2e-spec
```

## Error Handling

The application uses a centralized error handling system with custom exceptions:

```typescript
// Validation errors
throw new ValidationException('Email is invalid', { field: 'email' })

// Resource not found
throw new NotFoundException('Employee', employeeId)

// Business logic violations
throw new BusinessLogicException(
  'INVALID_PAYROLL',
  'Cannot calculate payroll without data',
)

// Authentication/Authorization
throw new UnauthorizedException('Invalid credentials')
throw new ForbiddenException('Access denied')
```

All exceptions are caught by the global exception filter and return consistent responses.

## Code Quality

### ESLint

```bash
bun lint              # Check for errors
bun lint --fix        # Auto-fix issues
```

### Prettier

```bash
bun format            # Format all files
```

### Pre-commit Hooks

Consider setting up Husky for automatic linting:

```bash
npm install husky lint-staged --save-dev
husky install
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/payroll_db

# JWT
JWT_SECRET=your_secret_key_here

# Application
NODE_ENV=development
PORT=3000

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=debug
```

## Performance Optimization

### Implemented

- Connection pooling with Prisma
- Query optimization
- Exception handling
- Validation pipe

### Recommended

- Redis caching for frequently accessed data
- Job queue for async processing
- Database indexes on frequently queried columns
- API rate limiting
- Compression middleware

## Contributing

### Code Review Checklist

- [ ] Follows module structure guidelines
- [ ] No circular dependencies
- [ ] Proper exception types used
- [ ] DTOs used for all inputs
- [ ] Tests written for new features
- [ ] Documentation updated
- [ ] ESLint passes
- [ ] No hardcoded secrets

### Git Workflow

1. Create feature branch: `git checkout -b feature/feature-name`
2. Make changes following architecture guidelines
3. Write/update tests
4. Run linting: `bun lint`
5. Commit with clear messages
6. Push and create pull request

## Troubleshooting

### Database Connection Error

```bash
# Check database is running
docker compose ps

# Restart database
docker compose restart postgres

# Reset migrations
bun prisma migrate reset
```

### Port Already in Use

```bash
# Change port in .env
PORT=3001
```

### Module Not Found

```bash
# Verify tsconfig paths
# Check import statement paths use @src/ prefix
```

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs)
- [Architecture Guide](./docs/architecture.md)
- [Module Structure Guide](./docs/module-structure.md)

## License

UNLICENSED - Internal project only

## Support

For issues or questions, contact the development team or create an issue in the repository.

---

**Last Updated:** February 18, 2026
