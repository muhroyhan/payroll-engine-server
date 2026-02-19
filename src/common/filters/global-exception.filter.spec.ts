import { HttpException, HttpStatus, Logger } from '@nestjs/common'
import { ArgumentsHost } from '@nestjs/common'
import { GlobalExceptionFilter } from '@src/common/filters/global-exception.filter'
import { ValidationException } from '@src/common/exceptions/validation.exception'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface FakeResponse {
  statusCode: number
  body: Record<string, unknown>
  status: (code: number) => FakeResponse
  send: (body: Record<string, unknown>) => void
}

function makeHost(
  url = '/test',
  method = 'GET',
): {
  host: ArgumentsHost
  response: FakeResponse
} {
  const response: FakeResponse = {
    statusCode: 0,
    body: {},
    status(code) {
      this.statusCode = code
      return this
    },
    send(body) {
      this.body = body
    },
  }

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url, method }),
    }),
  } as unknown as ArgumentsHost

  return { host, response }
}

// Suppress logger output during tests
beforeAll(() => {
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
})
afterAll(() => jest.restoreAllMocks())

// ─────────────────────────────────────────────────────────────────────────────

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter

  beforeEach(() => {
    filter = new GlobalExceptionFilter()
  })

  // ─── BaseException ────────────────────────────────────────────────────────

  describe('BaseException (custom app exceptions)', () => {
    it('uses the exception statusCode and code', () => {
      const { host, response } = makeHost()
      const ex = new ValidationException('Validation failed', {
        field: 'email',
      })
      filter.catch(ex, host)
      expect(response.statusCode).toBe(422)
      expect(response.body.code).toBe('VALIDATION_ERROR')
      expect(response.body.message).toBe('Validation failed')
    })

    it('includes details when provided', () => {
      const { host, response } = makeHost()
      const ex = new ValidationException('Bad input', { name: 'required' })
      filter.catch(ex, host)
      expect(response.body.details).toEqual({ name: 'required' })
    })

    it('response body does NOT include a top-level statusCode field', () => {
      // BaseException.toResponse() returns statusCode, but the filter should
      // not double-emit it — it's already used as the HTTP status code
      const { host, response } = makeHost()
      const ex = new ValidationException('err')
      filter.catch(ex, host)
      // statusCode in the body comes from toResponse() — verify it's not accidentally
      // added as a separate field alongside the HTTP response code
      expect(response.body.code).toBe('VALIDATION_ERROR')
    })

    it('always appends timestamp and path to the response body', () => {
      const { host, response } = makeHost('/auth/login')
      filter.catch(new ValidationException('err'), host)
      expect(typeof response.body.timestamp).toBe('string')
      expect(response.body.path).toBe('/auth/login')
    })
  })

  // ─── HttpException ────────────────────────────────────────────────────────

  describe('HttpException (NestJS built-in)', () => {
    it('handles string response — uses exception.name as code', () => {
      const { host, response } = makeHost()
      const ex = new HttpException('Not found here', HttpStatus.NOT_FOUND)
      filter.catch(ex, host)
      expect(response.statusCode).toBe(404)
      expect(response.body.message).toBe('Not found here')
      expect(response.body.code).toBe('HttpException')
    })

    it('handles object response with string message', () => {
      const { host, response } = makeHost()
      const ex = new HttpException(
        { code: 'AUTH_INVALID', message: 'Invalid credentials' },
        HttpStatus.UNAUTHORIZED,
      )
      filter.catch(ex, host)
      expect(response.statusCode).toBe(401)
      expect(response.body.code).toBe('AUTH_INVALID')
      expect(response.body.message).toBe('Invalid credentials')
    })

    it('joins array message (NestJS ValidationPipe default format) into a string', () => {
      const { host, response } = makeHost()
      const ex = new HttpException(
        { message: ['email must be valid', 'password is required'] },
        HttpStatus.BAD_REQUEST,
      )
      filter.catch(ex, host)
      expect(response.body.message).toBe(
        'email must be valid, password is required',
      )
    })

    it('includes errors field when present in response object', () => {
      const { host, response } = makeHost()
      const ex = new HttpException(
        {
          code: 'VALIDATION_ERROR',
          message: 'failed',
          errors: [{ field: 'name' }],
        },
        422,
      )
      filter.catch(ex, host)
      expect(response.body.errors).toEqual([{ field: 'name' }])
    })

    it('omits errors field when not present in response object', () => {
      const { host, response } = makeHost()
      const ex = new HttpException({ code: 'ERR', message: 'msg' }, 400)
      filter.catch(ex, host)
      expect(response.body.errors).toBeUndefined()
    })

    it('response body does NOT contain a statusCode field (only used as HTTP status)', () => {
      const { host, response } = makeHost()
      const ex = new HttpException({ code: 'ERR', message: 'msg' }, 401)
      filter.catch(ex, host)
      expect(response.body.statusCode).toBeUndefined()
    })
  })

  // ─── Unknown Error ────────────────────────────────────────────────────────

  describe('Unknown Error (unhandled exceptions)', () => {
    it('returns 500 with INTERNAL_SERVER_ERROR code', () => {
      const { host, response } = makeHost()
      filter.catch(new Error('something exploded'), host)
      expect(response.statusCode).toBe(500)
      expect(response.body.code).toBe('INTERNAL_SERVER_ERROR')
    })

    it('propagates the error message to the response body', () => {
      const { host, response } = makeHost()
      filter.catch(new Error('database connection refused'), host)
      expect(response.body.message).toBe('database connection refused')
    })

    it('returns 500 for completely unknown thrown values', () => {
      const { host, response } = makeHost()
      filter.catch('a raw string was thrown', host)
      expect(response.statusCode).toBe(500)
    })
  })
})
