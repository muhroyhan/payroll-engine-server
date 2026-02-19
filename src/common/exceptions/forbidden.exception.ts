import { BaseException } from './base.exception'

export class ForbiddenException extends BaseException {
  constructor(message = 'Forbidden resource') {
    super('FORBIDDEN', message, 403)
  }
}
