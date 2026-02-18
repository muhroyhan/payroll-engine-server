import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common'
import { BaseException } from '../exceptions/base.exception'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()
    const request = ctx.getRequest()

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
      body = {
        code: exception.name,
        message: exception.message,
        ...(typeof exceptionResponse === 'object' && exceptionResponse),
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

    response.status(statusCode).json({
      ...body,
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}
