/**
 * Auth E2E Tests
 *
 * Prerequisites:
 *   1. Containers running  : docker compose up  (or: bun start)
 *   2. Database seeded     : bun seed
 *   3. Fresh API instance  : docker compose restart api
 *      ↑ required only for Part 7 (rate limiter) — in-memory state from prior
 *        test runs would cause false failures. In CI the instance is always fresh.
 *
 * Run: bun test:e2e
 */

import request from 'supertest'

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

/** Password used by all seeded test users */
const PASS = 'Test12345!'

/** Seeded users (created by `bun seed` / prisma/seed.ts) */
const ADMIN = { email: 'admin@admin.com', role: 'tenant_admin' } as const
const OFFICER = { email: 'officer@admin.com', role: 'payroll_officer' } as const
const VIEWER = { email: 'viewer@admin.com', role: 'viewer' } as const

// ─────────────────────────────────────────────────────────────────────────────
// Shared token state — mutated across describe blocks (Jest runs them serially)
// ─────────────────────────────────────────────────────────────────────────────

let atAdmin: string, rtAdmin: string
let atOfficer: string, rtOfficer: string
let atViewer: string, rtViewer: string

// ─────────────────────────────────────────────────────────────────────────────
// Request helpers
// ─────────────────────────────────────────────────────────────────────────────

const api = request(BASE)

const login = (email: string, password: string) =>
  api.post('/auth/login').send({ email, password })

const me = (token: string) =>
  api.get('/auth/me').set('Authorization', `Bearer ${token}`)

const refresh = (token: string) =>
  api.post('/auth/refresh').send({ refreshToken: token })

const logout = (token: string) =>
  api.post('/auth/logout').set('Authorization', `Bearer ${token}`)

// ─────────────────────────────────────────────────────────────────────────────

describe('Auth (e2e)', () => {
  // ─── Part 1: Login ─────────────────────────────────────────────────────────

  describe('Part 1 — Login all 3 users', () => {
    it('1a. admin login returns 200 with correct role and tokens', async () => {
      const res = await login(ADMIN.email, PASS)
      expect(res.status).toBe(200)
      expect(res.body.user.role).toBe('tenant_admin')
      expect(res.body.user.email).toBe(ADMIN.email)
      expect(res.body.accessToken).toMatch(/^eyJhb/)
      expect(res.body.refreshToken).toMatch(/^eyJhb/)
      atAdmin = res.body.accessToken
      rtAdmin = res.body.refreshToken
    })

    it('1b. officer login returns 200 with correct role', async () => {
      const res = await login(OFFICER.email, PASS)
      expect(res.status).toBe(200)
      expect(res.body.user.role).toBe('payroll_officer')
      expect(res.body.user.email).toBe(OFFICER.email)
      atOfficer = res.body.accessToken
      rtOfficer = res.body.refreshToken
    })

    it('1c. viewer login returns 200 with correct role', async () => {
      const res = await login(VIEWER.email, PASS)
      expect(res.status).toBe(200)
      expect(res.body.user.role).toBe('viewer')
      expect(res.body.user.email).toBe(VIEWER.email)
      atViewer = res.body.accessToken
      rtViewer = res.body.refreshToken
    })

    it('1d. tokens are unique across users', () => {
      expect(atAdmin).not.toBe(atOfficer)
      expect(atAdmin).not.toBe(atViewer)
      expect(atOfficer).not.toBe(atViewer)
    })

    it('1e. email case normalization — UPPERCASE email accepts login', async () => {
      const res = await login(ADMIN.email.toUpperCase(), PASS)
      expect(res.status).toBe(200)
      expect(res.body.user.role).toBe('tenant_admin')
      // This login rotates the DB refresh token — update shared state
      atAdmin = res.body.accessToken
      rtAdmin = res.body.refreshToken
    })

    it('1f. padded email (" admin@admin.com ") → 422 (DTO @IsEmail rejects before service trim)', async () => {
      const res = await api
        .post('/auth/login')
        .send({ email: ` ${ADMIN.email} `, password: PASS })
      expect(res.status).toBe(422)
    })
  })

  // ─── Part 2: /auth/me ─────────────────────────────────────────────────────

  describe('Part 2 — GET /auth/me identity isolation', () => {
    it('2a. admin /me returns correct email and role', async () => {
      const res = await me(atAdmin)
      expect(res.status).toBe(200)
      expect(res.body.email).toBe(ADMIN.email)
      expect(res.body.role).toBe('tenant_admin')
    })

    it('2b. officer /me returns correct email and role', async () => {
      const res = await me(atOfficer)
      expect(res.status).toBe(200)
      expect(res.body.email).toBe(OFFICER.email)
      expect(res.body.role).toBe('payroll_officer')
    })

    it('2c. viewer /me returns correct email and role', async () => {
      const res = await me(atViewer)
      expect(res.status).toBe(200)
      expect(res.body.email).toBe(VIEWER.email)
      expect(res.body.role).toBe('viewer')
    })

    it('2d. all three users belong to the same tenant', async () => {
      const [ra, ro, rv] = await Promise.all([
        me(atAdmin),
        me(atOfficer),
        me(atViewer),
      ])
      expect(ra.body.tenantId).toBe(ro.body.tenantId)
      expect(ra.body.tenantId).toBe(rv.body.tenantId)
    })

    it('2e. admin token does NOT return officer identity (cross-identity check)', async () => {
      expect((await me(atAdmin)).body.email).toBe(ADMIN.email)
      expect((await me(atOfficer)).body.email).toBe(OFFICER.email)
    })

    it('2f. no token → 401', async () => {
      expect((await api.get('/auth/me')).status).toBe(401)
    })
  })

  // ─── Part 3: Token refresh ─────────────────────────────────────────────────

  describe('Part 3 — Token refresh per user', () => {
    // Re-login all users: 1e (uppercase login) rotated admin's DB refresh token,
    // making the rtAdmin from 1a stale. Fresh tokens needed before refresh tests.
    beforeAll(async () => {
      const [ra, ro, rv] = await Promise.all([
        login(ADMIN.email, PASS),
        login(OFFICER.email, PASS),
        login(VIEWER.email, PASS),
      ])
      atAdmin = ra.body.accessToken
      rtAdmin = ra.body.refreshToken
      atOfficer = ro.body.accessToken
      rtOfficer = ro.body.refreshToken
      atViewer = rv.body.accessToken
      rtViewer = rv.body.refreshToken
    })

    let rtAdminBeforeRotation: string // captured before 3a — used to assert rejection in 3b

    it('3a. admin refresh → 200 with new rotated refresh token', async () => {
      rtAdminBeforeRotation = rtAdmin // save BEFORE the call rotates it
      const res = await refresh(rtAdmin)
      expect(res.status).toBe(200)
      expect(res.body.refreshToken).not.toBe(rtAdminBeforeRotation)
      atAdmin = res.body.accessToken
      rtAdmin = res.body.refreshToken
    })

    it('3b. old admin refresh token → 401 after rotation', async () => {
      expect((await refresh(rtAdminBeforeRotation)).status).toBe(401)
    })

    it('3c. new admin access token still identifies admin', async () => {
      const res = await me(atAdmin)
      expect(res.status).toBe(200)
      expect(res.body.email).toBe(ADMIN.email)
    })

    it('3d. officer refresh is independent of admin', async () => {
      const res = await refresh(rtOfficer)
      expect(res.status).toBe(200)
      atOfficer = res.body.accessToken
      rtOfficer = res.body.refreshToken
      expect((await me(atOfficer)).body.email).toBe(OFFICER.email)
    })

    it('3e. viewer refresh is independent of admin and officer', async () => {
      const res = await refresh(rtViewer)
      expect(res.status).toBe(200)
      atViewer = res.body.accessToken
      rtViewer = res.body.refreshToken
    })
  })

  // ─── Part 4: Logout isolation ─────────────────────────────────────────────

  describe('Part 4 — Logout isolation between users', () => {
    let atOff4: string, rtOff4: string

    beforeAll(async () => {
      const res = await login(OFFICER.email, PASS)
      atOff4 = res.body.accessToken
      rtOff4 = res.body.refreshToken
    })

    it('4a. officer logout returns 200', async () => {
      expect((await logout(atOff4)).status).toBe(200)
    })

    it('4b. officer refresh token is invalidated after logout', async () => {
      expect((await refresh(rtOff4)).status).toBe(401)
    })

    it('4c. admin session UNAFFECTED by officer logout', async () => {
      const res = await me(atAdmin)
      expect(res.status).toBe(200)
      expect(res.body.email).toBe(ADMIN.email)
    })

    it('4d. viewer refresh UNAFFECTED by officer logout', async () => {
      const res = await refresh(rtViewer)
      expect(res.status).toBe(200)
      rtViewer = res.body.refreshToken
    })

    it('4e. officer can re-login after logout', async () => {
      const res = await login(OFFICER.email, PASS)
      expect(res.status).toBe(200)
      expect(res.body.user.role).toBe('payroll_officer')
      atOfficer = res.body.accessToken
      rtOfficer = res.body.refreshToken
    })
  })

  // ─── Part 5: Single-session model ────────────────────────────────────────

  describe('Part 5 — Single-session model (second login replaces first)', () => {
    let atS1: string, rtS1: string
    let atS2: string

    beforeAll(async () => {
      const s1 = await login(ADMIN.email, PASS)
      atS1 = s1.body.accessToken
      rtS1 = s1.body.refreshToken

      const s2 = await login(ADMIN.email, PASS)
      atS2 = s2.body.accessToken
      atAdmin = s2.body.accessToken
      rtAdmin = s2.body.refreshToken
    })

    it('5a. session 2 /me works', async () => {
      expect((await me(atS2)).status).toBe(200)
    })

    it('5b. session 1 refresh token → 401 (invalidated by session 2 login)', async () => {
      expect((await refresh(rtS1)).status).toBe(401)
    })

    it('5c. session 1 access token remains valid until expiry (no server-side AT blacklist)', async () => {
      expect((await me(atS1)).status).toBe(200)
    })
  })

  // ─── Part 6: Input validation ─────────────────────────────────────────────

  describe('Part 6 — Input validation', () => {
    it('6a. missing email → 422 with VALIDATION_ERROR code', async () => {
      const res = await api.post('/auth/login').send({ password: PASS })
      expect(res.status).toBe(422)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('6b. missing password → 422', async () => {
      expect(
        (await api.post('/auth/login').send({ email: ADMIN.email })).status,
      ).toBe(422)
    })

    it('6c. invalid email format → 422', async () => {
      expect(
        (
          await api
            .post('/auth/login')
            .send({ email: 'notanemail', password: PASS })
        ).status,
      ).toBe(422)
    })

    it('6d. weak password (fails @IsStrongPassword) → 422', async () => {
      expect(
        (
          await api
            .post('/auth/login')
            .send({ email: ADMIN.email, password: 'weak' })
        ).status,
      ).toBe(422)
    })

    it('6e. empty body → 422', async () => {
      expect((await api.post('/auth/login').send({})).status).toBe(422)
    })

    it('6f. missing refreshToken body → 422', async () => {
      expect((await api.post('/auth/refresh').send({})).status).toBe(422)
    })

    it('6g. malformed string as refresh token → 401', async () => {
      expect(
        (await api.post('/auth/refresh').send({ refreshToken: 'not.a.jwt' }))
          .status,
      ).toBe(401)
    })

    it('6h. extra unknown fields stripped (whitelist) — login still returns 200', async () => {
      const res = await api
        .post('/auth/login')
        .send({ email: ADMIN.email, password: PASS, extraField: 'ignored' })
      expect(res.status).toBe(200)
      expect(res.body.accessToken).toBeDefined()
    })
  })

  // ─── Part 7: Rate limiter ─────────────────────────────────────────────────

  /**
   * These tests lock officer@admin.com. Parts 1–6 must complete first.
   * Requires a fresh in-memory state on the API (failedAttemptsStore empty).
   * In CI the API instance is always fresh. Locally: docker compose restart api.
   */
  describe('Part 7 — Rate limiter is per-email (users do not share limits)', () => {
    it('7a. admin login baseline works (confirms clean server state)', async () => {
      const res = await login(ADMIN.email, PASS)
      expect(res.status).toBe(200)
      atAdmin = res.body.accessToken
      rtAdmin = res.body.refreshToken
    })

    it('7b-7c. 5 wrong attempts on officer locks it — 6th attempt → 429 even with correct password', async () => {
      for (let i = 0; i < 5; i++) await login(OFFICER.email, 'WrongPass1!')
      expect((await login(OFFICER.email, 'WrongPass1!')).status).toBe(429)
      expect((await login(OFFICER.email, PASS)).status).toBe(429)
    })

    it('7d. admin login UNAFFECTED by officer lockout', async () => {
      expect((await login(ADMIN.email, PASS)).status).toBe(200)
    })

    it('7e. viewer login UNAFFECTED by officer lockout', async () => {
      expect((await login(VIEWER.email, PASS)).status).toBe(200)
    })

    it('7f. unregistered email never rate-limited (no attempts recorded)', async () => {
      const ghost = 'ghost.e2e@nobody.invalid'
      for (let i = 0; i < 6; i++) await login(ghost, 'WrongPass1!')
      // 7th attempt must still return 401, never 429
      expect((await login(ghost, 'WrongPass1!')).status).toBe(401)
    })

    it('7g. successful login clears the failed-attempt counter', async () => {
      for (let i = 0; i < 4; i++) await login(ADMIN.email, 'WrongPass1!') // 4 fails < threshold
      expect((await login(ADMIN.email, PASS)).status).toBe(200) // clears counter
      expect((await login(ADMIN.email, PASS)).status).toBe(200) // not locked after clear
    })
  })

  // ─── Part 8: Security edge cases ─────────────────────────────────────────

  describe('Part 8 — Security edge cases', () => {
    let atFresh: string

    beforeAll(async () => {
      const res = await login(ADMIN.email, PASS)
      atFresh = res.body.accessToken
    })

    it('8a. access token cannot be used as a refresh token → 401', async () => {
      expect((await refresh(atFresh)).status).toBe(401)
    })

    it('8b. Basic auth header (not Bearer) → 401', async () => {
      expect(
        (await api.get('/auth/me').set('Authorization', 'Basic dGVzdDp0ZXN0'))
          .status,
      ).toBe(401)
    })

    it('8c. tampered access token (flipped tail chars) → 401', async () => {
      expect((await me(atFresh.slice(0, -3) + 'XXX')).status).toBe(401)
    })

    it('8d. /auth/me response does not leak password or refreshToken fields', async () => {
      const res = await me(atFresh)
      expect(res.status).toBe(200)
      expect(res.body.password).toBeUndefined()
      expect(res.body.refreshToken).toBeUndefined()
    })

    it('8e. wrong-password error message identical for registered vs unregistered email (anti-enumeration)', async () => {
      const [registered, unregistered] = await Promise.all([
        login(ADMIN.email, 'WrongPass1!'),
        login('totally.unknown.e2e@nobody.invalid', 'WrongPass1!'),
      ])
      expect(registered.status).toBe(401)
      expect(unregistered.status).toBe(401)
      expect(registered.body.message).toBe(unregistered.body.message)
    })

    it('8f. error response body has code/message but NOT statusCode field', async () => {
      const res = await login(ADMIN.email, 'WrongPass1!')
      expect(res.status).toBe(401)
      expect(res.body.code).toBeDefined()
      expect(res.body.message).toBeDefined()
      expect(res.body.statusCode).toBeUndefined()
    })
  })
})
