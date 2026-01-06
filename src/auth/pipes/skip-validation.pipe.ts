import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * Pipe that does nothing - completely skips validation
 * Use this when you want to bypass all validation
 */
@Injectable()
export class SkipValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    return value; // Just return the value as-is, no validation
  }
}








