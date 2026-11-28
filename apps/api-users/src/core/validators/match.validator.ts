/**
 * @file MatchConstraint
 * @description Custom validator to check if two properties on an object have the same value.
 *   This is commonly used for fields like 'password' and 'confirmPassword' to ensure they match.
 *
 * @example
 * // In a DTO:
 * // @IsString()
 * // @MinLength(8)
 * // password!: string;
 *
 * // @IsString()
 * // @Validate(MatchConstraint, ['password'], { message: 'Passwords do not match' })
 * // confirmPassword!: string;
 */
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'Match', async: false })
export class MatchConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    return value === relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} must match ${relatedPropertyName}`;
  }
}
