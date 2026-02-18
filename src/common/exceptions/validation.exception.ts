import { BaseException } from './base.exception'

export class ValidationException extends BaseException {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, details)
  }
}
