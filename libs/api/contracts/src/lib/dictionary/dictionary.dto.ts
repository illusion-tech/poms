import {
    CreateDictionaryItemRequestSchema,
    DictionaryItemListQuerySchema,
    DictionaryItemListSchema,
    DictionaryItemSummarySchema,
    UpdateDictionaryItemRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class DictionaryItemDto extends createZodDto(DictionaryItemSummarySchema) {}

export class DictionaryItemListDto extends createZodDto(DictionaryItemListSchema) {}

export class DictionaryItemListQueryDto extends createZodDto(DictionaryItemListQuerySchema) {}

export class CreateDictionaryItemRequestDto extends createZodDto(CreateDictionaryItemRequestSchema) {}

export class UpdateDictionaryItemRequestDto extends createZodDto(UpdateDictionaryItemRequestSchema) {}
