import {
    AuditLogListQuerySchema,
    AuditLogListSchema,
    AuditLogSummarySchema,
    RecordRouteDeniedSecurityEventRequestSchema,
    SecurityEventListQuerySchema,
    SecurityEventListSchema,
    SecurityEventSummarySchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class AuditLogSummaryDto extends createZodDto(AuditLogSummarySchema) {}

export class AuditLogListDto extends createZodDto(AuditLogListSchema) {}

export class AuditLogListQueryDto extends createZodDto(AuditLogListQuerySchema) {}

export class SecurityEventSummaryDto extends createZodDto(SecurityEventSummarySchema) {}

export class SecurityEventListDto extends createZodDto(SecurityEventListSchema) {}

export class SecurityEventListQueryDto extends createZodDto(SecurityEventListQuerySchema) {}

export class RecordRouteDeniedSecurityEventRequestDto extends createZodDto(RecordRouteDeniedSecurityEventRequestSchema) {}
