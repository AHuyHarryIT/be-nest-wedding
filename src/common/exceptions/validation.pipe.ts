import { Injectable, PipeTransform, ArgumentMetadata } from '@nestjs/common';
import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ValidationException } from './app.exception';
import { FieldErrorDto } from './error-response.dto';

/**
 * Global validation pipe with custom error formatting
 * Validates input DTOs and provides user-friendly error messages
 */
@Injectable()
export class GlobalValidationPipe implements PipeTransform {
  async transform(
    value: unknown,
    metadata: ArgumentMetadata,
  ): Promise<unknown> {
    const { metatype, type } = metadata;

    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    if (type === 'body' && (value === undefined || value === null)) {
      throw new ValidationException('Validation failed', {
        fields: [
          {
            field: 'body',
            code: 'isNotEmpty',
            message: 'Request body is required',
            value,
          },
        ],
      });
    }

    const object = plainToInstance(
      metatype as ClassConstructor<unknown>,
      value as Record<string, unknown>,
    );
    const errors = await validate(object as object, {
      skipMissingProperties: false,
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const fieldErrors = this.formatValidationErrors(errors);
      throw new ValidationException('Validation failed', {
        fields: fieldErrors,
      });
    }

    return object;
  }

  private formatValidationErrors(errors: ValidationError[]): FieldErrorDto[] {
    const fieldErrors: FieldErrorDto[] = [];

    const processError = (
      error: ValidationError,
      parentField: string = '',
    ): void => {
      const field = parentField
        ? `${parentField}.${error.property}`
        : error.property;

      if (error.constraints) {
        Object.entries(error.constraints).forEach(([code, message]) => {
          fieldErrors.push({
            field,
            code,
            message,
            value: error.value,
          });
        });
      }

      if (error.children && error.children.length > 0) {
        error.children.forEach((child: ValidationError) => {
          processError(child, field);
        });
      }
    };

    errors.forEach((error: ValidationError) => processError(error));
    return fieldErrors;
  }

  private toValidate(metatype: unknown): metatype is object {
    const types: unknown[] = [String, Boolean, Number, Array, Object];
    return !(types as object[]).includes(metatype as object);
  }
}
