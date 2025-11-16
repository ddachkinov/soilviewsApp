import { PartialType } from '@nestjs/swagger';
import { CreateFieldDto } from './create-field.dto';

/**
 * DTO for updating an existing field.
 * All fields from CreateFieldDto are optional.
 */
export class UpdateFieldDto extends PartialType(CreateFieldDto) {}
