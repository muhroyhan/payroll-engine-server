# Auth Flow

## Endpoints

| Method | Path          | Auth Required | Description                           |
| ------ | ------------- | ------------- | ------------------------------------- |
| POST   | /auth/login   | No            | Login with email + password           |
| POST   | /auth/refresh | No            | Get new token pair with refresh token |
| POST   | /auth/logout  | Yes (JWT)     | Invalidate refresh token              |
| GET    | /auth/me      | Yes (JWT)     | Get current user profile              |

---

## Login Flow

```
Client
  │
  │  POST /auth/login
  │  { email, password }
  │
  ▼
EmailThrottlerGuard
  │  Check in-memory failed attempt count for this email
  │  If >= 5 failed attempts within 15min → 429 Too Many Requests
  │  (Only failed attempts count. Unregistered emails are NOT counted.)
  │
  ▼
AuthController.login()
  │
  ▼
AuthService.validateUser(email, password)
  │  1. Normalize email (lowercase + trim)
  │  2. Query DB: User WHERE email = ? AND isActive = true
  │  3. If user not found → 401 (no attempt recorded)
  │  4. bcrypt.compare(password, user.password)
  │  5. If wrong password → record failed attempt → 401
  │  6. Return User object
  │
  ▼
AuthService.login(user)
  │  1. Generate access token (JWT, 15 min, HS256)
  │     Payload: { sub, email, role, tenantId }
  │  2. Generate refresh token (JWT, 7 days, HS256)
  │     Payload: { sub, email, role, tenantId, jti: randomUUID() }
  │     (jti guarantees uniqueness even when tokens are issued in the same second)
  │  3. SHA-256(refreshToken) → store hex digest in User.refreshToken
  │  4. Clear failed attempt counter for this email
  │
  ▼
Response 200
{
  "accessToken":  "<jwt>",
  "refreshToken": "<jwt>",
  "user": {
    "id":       "...",
    "email":    "...",
    "fullName": "...",
    "role":     "tenant_admin",
    "tenantId": "..."
  }
}
```

---

## Authenticated Request Flow

Every protected endpoint (anything without `@Public()`) goes through:

```
Client
  │
  │  GET /any-protected-route
  │  Authorization: Bearer <accessToken>
  │
  ▼
JwtAuthGuard (global)
  │  1. Check if route has @Public() → skip if yes
  │  2. Extract token from Authorization header
  │  3. Verify JWT signature + expiry via JwtStrategy
  │  4. If invalid/expired → 401
  │
  ▼
JwtStrategy.validate(payload)
  │  Returns AuthUser: { userId, email, role, tenantId }
  │  Attached to request as request.user
  │
  ▼
Controller method — @CurrentUser() extracts AuthUser from request
```

---

## Token Refresh Flow

Used when `accessToken` expires (after 15 min) but the user still has a valid `refreshToken` (7 days).

```
Client
  │
  │  POST /auth/refresh
  │  { refreshToken: "<jwt>" }
  │
  ▼
AuthService.refresh(refreshToken)
  │  1. jwt.verifyAsync(refreshToken) — check signature + expiry
  │  2. If invalid/expired → 401
  │  3. Query DB for user by payload.sub
  │  4. If user not found or inactive → 401
  │  5. If User.refreshToken is null → already logged out → 401
  │  6. SHA-256(refreshToken) → compare hex digest with User.refreshToken
  │  7. If mismatch (constant-time string compare) → 401
  │  8. Generate new access + refresh token pair
  │  9. Store new refresh token hash in DB
  │
  ▼
Response 200 — same shape as login response
```

> **Note:** Each refresh rotates both tokens (refresh token rotation). The old refresh token is immediately invalidated.

---

## Logout Flow

```
Client
  │
  │  POST /auth/logout
  │  Authorization: Bearer <accessToken>
  │
  ▼
JwtAuthGuard — validates access token
  │
  ▼
AuthService.logout(userId)
  │  Sets User.refreshToken = null in DB
  │
  ▼
Response 200
{ "success": true }
```

> **Important limitation:** The `accessToken` itself remains valid until its 15-minute expiry. There is no blacklist implemented.  
> For immediate revocation (e.g. security incident), a token blacklist (Redis or DB table) should be added.

---

## Rate Limiting Summary

### Global (all routes)

- **100 requests per 60 seconds** per IP
- Enforced by `@nestjs/throttler` (ThrottlerGuard, registered as APP_GUARD)

### Login-specific (POST /auth/login only)

- **5 failed attempts per 15 minutes** per email address
- Enforced by `EmailThrottlerGuard` (in-memory Map)
- Rules:
  - Only **failed** attempts (wrong password) are counted
  - **Unregistered emails** are NOT counted
  - A **successful login** resets the counter to zero
  - Exceeding limit returns `429 Too Many Requests` with `Retry-After` header

---

## Token Details

| Token         | Expiry | Algorithm | Stored in DB?                                      |
| ------------- | ------ | --------- | -------------------------------------------------- |
| Access token  | 15 min | HS256     | No                                                 |
| Refresh token | 7 days | HS256     | Yes — as SHA-256 hex digest in `User.refreshToken` |

### JWT Payload

**Access token payload:**

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "tenant_admin",
  "tenantId": "tenant-uuid",
  "iat": 1234567890,
  "exp": 1234568790
}
```

**Refresh token payload** (same fields + `jti`):

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "tenant_admin",
  "tenantId": "tenant-uuid",
  "jti": "550e8400-e29b-41d4-a716-446655440000",
  "iat": 1234567890,
  "exp": 1235172690
}
```

> `jti` (JWT ID) is a `randomUUID()` added to refresh tokens only. It guarantees every refresh token is unique regardless of issue time, which is required for reliable token rotation detection.

---

## Security Decisions

| Decision                                                      | Reason                                                                                                                                                         |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generic error message for both wrong email and wrong password | Prevents user enumeration — attacker can't distinguish "email not found" from "wrong password"                                                                 |
| Unregistered emails not rate-limited                          | Prevents locking out real users by an attacker submitting their email                                                                                          |
| Refresh token stored as SHA-256 hash                          | SHA-256 has no 72-byte input limit (unlike bcrypt which silently truncates) — critical for JWTs which are ~200+ bytes. DB breach doesn't expose usable tokens. |
| `jti: randomUUID()` in refresh tokens                         | Ensures token uniqueness for rotation detection even when two tokens are issued within the same second                                                         |
| Access token not stored                                       | Stateless — no revocation needed for normal logout                                                                                                             |
| `@Public()` opt-out pattern                                   | All routes are protected by default — new routes are secure unless explicitly marked public                                                                    |
