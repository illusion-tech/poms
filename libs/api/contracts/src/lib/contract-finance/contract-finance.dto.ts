import {
    CloseInvoiceRecordRequestSchema,
    ConfirmPaymentRecordRequestSchema,
    ConfirmReceiptRecordRequestSchema,
    CreateInvoiceRecordRequestSchema,
    CreatePaymentRecordRequestSchema,
    CreateReceiptRecordRequestSchema,
    InvoiceRecordDetailViewSchema,
    InvoiceRecordListSchema,
    InvoiceRecordSummarySchema,
    MarkInvoiceExceptionRequestSchema,
    PaymentRecordListSchema,
    PaymentRecordSummarySchema,
    ResolveInvoiceExceptionRequestSchema,
    ReceiptRecordListSchema,
    ReceiptRecordSummarySchema,
    UpdateInvoiceRecordRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class ReceiptRecordDto extends createZodDto(ReceiptRecordSummarySchema) {}

export class ReceiptRecordListDto extends createZodDto(ReceiptRecordListSchema) {}

export class CreateReceiptRecordRequestDto extends createZodDto(CreateReceiptRecordRequestSchema) {}

export class ConfirmReceiptRecordRequestDto extends createZodDto(ConfirmReceiptRecordRequestSchema) {}

export class InvoiceRecordDto extends createZodDto(InvoiceRecordSummarySchema) {}

export class InvoiceRecordListDto extends createZodDto(InvoiceRecordListSchema) {}

export class InvoiceRecordDetailViewDto extends createZodDto(InvoiceRecordDetailViewSchema) {}

export class CreateInvoiceRecordRequestDto extends createZodDto(CreateInvoiceRecordRequestSchema) {}

export class UpdateInvoiceRecordRequestDto extends createZodDto(UpdateInvoiceRecordRequestSchema) {}

export class MarkInvoiceExceptionRequestDto extends createZodDto(MarkInvoiceExceptionRequestSchema) {}

export class ResolveInvoiceExceptionRequestDto extends createZodDto(ResolveInvoiceExceptionRequestSchema) {}

export class CloseInvoiceRecordRequestDto extends createZodDto(CloseInvoiceRecordRequestSchema) {}

export class PaymentRecordDto extends createZodDto(PaymentRecordSummarySchema) {}

export class PaymentRecordListDto extends createZodDto(PaymentRecordListSchema) {}

export class CreatePaymentRecordRequestDto extends createZodDto(CreatePaymentRecordRequestSchema) {}

export class ConfirmPaymentRecordRequestDto extends createZodDto(ConfirmPaymentRecordRequestSchema) {}
