import { Injectable, PipeTransform, ArgumentMetadata } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ValidationException } from './app.exception';
import { FieldErrorDto } from './error-response.dto';

/**
 * Global validation pipe with custom error formatting
 * Validates input DTOs and provides user-friendly error messages
 */
@Injectable()
export class GlobalValidationPipe implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    const { metatype } = metadata;

    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object, {
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

    const processError = (error: ValidationError, parentField: string = '') => {
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
        error.children.forEach((child) => {
          processError(child, field);
        });
      }
    };

    errors.forEach((error) => processError(error));
    return fieldErrors;
  }

  private toValidate(metatype: any): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
