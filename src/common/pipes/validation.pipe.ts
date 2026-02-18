import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { ValidationException } from '../exceptions/validation.exception'

@Injectable()
export class ValidationPipe implements PipeTransform {
  async transform(value: unknown, metadata: ArgumentMetadata) {
    if (!metadata.type || metadata.type !== 'body' || !metadata.metatype) {
      return value
    }

    const object = plainToInstance(metadata.metatype, value)

    if (typeof object !== 'object') {
      return value
    }

    const errors = await validate(object as object)

    if (errors.length > 0) {
      const details = errors.reduce(
        (acc, error) => {
          acc[error.property] = Object.values(error.constraints || {})
          return acc
        },
        {} as Record<string, string[]>,
      )

      throw new ValidationException('Validation failed', details)
    }

    return object
  }
}
