import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

@ValidatorConstraint({ name: 'isPasswordMatch', async: false })
export class IsPasswordMatchConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments): boolean {
    if (!args.constraints || args.constraints.length === 0) {
      return false;
    }
    const relatedPropertyName = args.constraints[0] as string;
    const relatedValue = (args.object as Record<string, unknown>)[
      relatedPropertyName
    ];
    return confirmPassword === relatedValue;
  }

  defaultMessage(args: ValidationArguments): string {
    if (!args.constraints || args.constraints.length === 0) {
      return 'Password confirmation does not match';
    }
    const relatedPropertyName = args.constraints[0] as string;
    return `${relatedPropertyName} and ${args.property} do not match`;
  }
}

export function IsPasswordMatch(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: IsPasswordMatchConstraint,
    });
  };
}
