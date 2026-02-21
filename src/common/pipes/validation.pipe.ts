import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { ValidationException } from '../exceptions/validation.exception'

@Injectable()
export class ValidationPipe implements PipeTransform {
  async transform(value: unknown, metadata: ArgumentMetadata) {
    // Handle body and query parameters
    if (
      !metadata.type ||
      !['body', 'query'].includes(metadata.type) ||
      !metadata.metatype
    ) {
      return value
    }

    const object = plainToInstance(metadata.metatype, value, {
      enableImplicitConversion: true,
    })

    if (typeof object !== 'object') {
      return value
    }

    const errors = await validate(object as object, {
      whitelist: true, // strip properties not in DTO
      forbidNonWhitelisted: false, // strip silently (don't throw on unknown fields)
    })

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
