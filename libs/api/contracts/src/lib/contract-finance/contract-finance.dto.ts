import {
    ConfirmPaymentRecordRequestSchema,
    ConfirmReceiptRecordRequestSchema,
    CreatePaymentRecordRequestSchema,
    CreateReceiptRecordRequestSchema,
    PaymentRecordListSchema,
    PaymentRecordSummarySchema,
    ReceiptRecordListSchema,
    ReceiptRecordSummarySchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class ReceiptRecordDto extends createZodDto(ReceiptRecordSummarySchema) {}

export class ReceiptRecordListDto extends createZodDto(ReceiptRecordListSchema) {}

export class CreateReceiptRecordRequestDto extends createZodDto(CreateReceiptRecordRequestSchema) {}

export class ConfirmReceiptRecordRequestDto extends createZodDto(ConfirmReceiptRecordRequestSchema) {}

export class PaymentRecordDto extends createZodDto(PaymentRecordSummarySchema) {}

export class PaymentRecordListDto extends createZodDto(PaymentRecordListSchema) {}

export class CreatePaymentRecordRequestDto extends createZodDto(CreatePaymentRecordRequestSchema) {}

export class ConfirmPaymentRecordRequestDto extends createZodDto(ConfirmPaymentRecordRequestSchema) {}
