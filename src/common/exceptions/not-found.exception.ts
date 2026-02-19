import { BaseException } from './base.exception'

export class NotFoundException extends BaseException {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier
      ? `${resource} with id ${identifier} not found`
      : `${resource} not found`
    super('NOT_FOUND', message, 404)
  }
}
