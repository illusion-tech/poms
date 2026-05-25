import { SystemSettingListSchema, SystemSettingSummarySchema, UpdateSystemSettingRequestSchema } from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class SystemSettingDto extends createZodDto(SystemSettingSummarySchema) {}

export class SystemSettingListDto extends createZodDto(SystemSettingListSchema) {}

export class UpdateSystemSettingRequestDto extends createZodDto(UpdateSystemSettingRequestSchema) {}
