import { BaseException } from './base.exception'

export class UnauthorizedException extends BaseException {
  constructor(message = 'Unauthorized access') {
    super('UNAUTHORIZED', message, 401)
  }
}
