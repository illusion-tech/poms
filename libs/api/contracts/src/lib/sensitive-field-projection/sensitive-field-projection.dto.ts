import { SensitiveStringFieldProjectionSchema } from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class SensitiveStringFieldProjectionDto extends createZodDto(SensitiveStringFieldProjectionSchema) {}
