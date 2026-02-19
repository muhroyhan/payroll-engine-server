import { BaseException } from './base.exception'

export class BusinessLogicException extends BaseException {
  constructor(
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(code, message, 422, details)
  }
}
