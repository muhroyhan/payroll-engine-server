import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'
import { BaseException } from '../exceptions/base.exception'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()

    let statusCode = 500
    let body: Record<string, unknown> = {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    }

    if (exception instanceof BaseException) {
      statusCode = exception.statusCode
      body = exception.toResponse()
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus()
      const exceptionResponse = exception.getResponse()
      if (typeof exceptionResponse === 'string') {
        body = { code: exception.name, message: exceptionResponse }
      } else {
        const resp = exceptionResponse as Record<string, unknown>
        // Extract message cleanly — NestJS validation errors put an array in resp.message
        const message = Array.isArray(resp.message)
          ? (resp.message as string[]).join(', ')
          : typeof resp.message === 'string'
            ? resp.message
            : exception.message
        body = {
          code: (resp.code as string) ?? exception.name,
          message,
          ...(resp.errors ? { errors: resp.errors } : {}),
        }
      }
    } else if (exception instanceof Error) {
      body.message = exception.message
      this.logger.error(
        `Unhandled Exception: ${exception.message}`,
        exception.stack,
      )
    }

    this.logger.error(`${request.method} ${request.url}`, {
      statusCode,
      body,
      timestamp: new Date().toISOString(),
    })

    response.status(statusCode).send({
      ...body,
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}
