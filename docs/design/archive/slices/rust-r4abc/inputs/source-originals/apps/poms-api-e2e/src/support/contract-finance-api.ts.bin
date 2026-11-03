import type { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import type {
    ClosePayableRecordRequest,
    CloseInvoiceRecordRequest,
    ConfirmPaymentRecordRequest,
    ConfirmReceiptRecordRequest,
    CreatePayableRecordRequest,
    CreateInvoiceRecordRequest,
    CreatePaymentRecordRequest,
    CreateReceiptRecordRequest,
    InvoiceRecordDetailView,
    InvoiceRecordSummary,
    MarkInvoiceExceptionRequest,
    PayableRecordDetailView,
    PayableRecordSummary,
    PaymentRecordSummary,
    ReceiptRecordSummary,
    ResolveInvoiceExceptionRequest,
    UpdateInvoiceRecordRequest,
    UpdatePayableRecordRequest,
    VoidPayableRecordRequest
} from './types';

export async function listReceipts(
    client: AxiosInstance,
    contractId: string
): Promise<ReceiptRecordSummary[]> {
    const response = await client.get<ReceiptRecordSummary[]>(
        `/contracts/${contractId}/receipt-records`
    );
    return expectStatus(response, 200);
}

export async function createReceipt(
    client: AxiosInstance,
    contractId: string,
    input: CreateReceiptRecordRequest
): Promise<ReceiptRecordSummary> {
    const response = await client.post<ReceiptRecordSummary>(
        `/contracts/${contractId}/receipt-records`,
        input
    );
    return expectStatus(response, 201);
}

export async function confirmReceipt(
    client: AxiosInstance,
    receiptId: string,
    input: ConfirmReceiptRecordRequest
): Promise<ReceiptRecordSummary> {
    const response = await client.post<ReceiptRecordSummary>(
        `/receipt-records/${receiptId}:confirm`,
        input
    );
    return expectStatus(response, 200);
}

export async function listPayables(
    client: AxiosInstance,
    projectId: string
): Promise<PayableRecordSummary[]> {
    const response = await client.get<PayableRecordSummary[]>(
        `/projects/${projectId}/payable-records`
    );
    return expectStatus(response, 200);
}

export async function getPayable(
    client: AxiosInstance,
    payableId: string
): Promise<PayableRecordDetailView> {
    const response = await client.get<PayableRecordDetailView>(
        `/payable-records/${payableId}`
    );
    return expectStatus(response, 200);
}

export async function createPayable(
    client: AxiosInstance,
    projectId: string,
    input: CreatePayableRecordRequest
): Promise<PayableRecordSummary> {
    const response = await client.post<PayableRecordSummary>(
        `/projects/${projectId}/payable-records`,
        input
    );
    return expectStatus(response, 201);
}

export async function updatePayable(
    client: AxiosInstance,
    payableId: string,
    input: UpdatePayableRecordRequest
): Promise<PayableRecordSummary> {
    const response = await client.patch<PayableRecordSummary>(
        `/payable-records/${payableId}`,
        input
    );
    return expectStatus(response, 200);
}

export async function closePayable(
    client: AxiosInstance,
    payableId: string,
    input: ClosePayableRecordRequest
): Promise<PayableRecordSummary> {
    const response = await client.post<PayableRecordSummary>(
        `/payable-records/${payableId}:close`,
        input
    );
    return expectStatus(response, 200);
}

export async function voidPayable(
    client: AxiosInstance,
    payableId: string,
    input: VoidPayableRecordRequest
): Promise<PayableRecordSummary> {
    const response = await client.post<PayableRecordSummary>(
        `/payable-records/${payableId}:void`,
        input
    );
    return expectStatus(response, 200);
}

export async function listInvoices(
    client: AxiosInstance,
    projectId: string
): Promise<InvoiceRecordSummary[]> {
    const response = await client.get<InvoiceRecordSummary[]>(
        `/projects/${projectId}/invoice-records`
    );
    return expectStatus(response, 200);
}

export async function getInvoice(
    client: AxiosInstance,
    invoiceId: string
): Promise<InvoiceRecordDetailView> {
    const response = await client.get<InvoiceRecordDetailView>(
        `/invoice-records/${invoiceId}`
    );
    return expectStatus(response, 200);
}

export async function createInvoice(
    client: AxiosInstance,
    projectId: string,
    input: CreateInvoiceRecordRequest
): Promise<InvoiceRecordSummary> {
    const response = await client.post<InvoiceRecordSummary>(
        `/projects/${projectId}/invoice-records`,
        input
    );
    return expectStatus(response, 201);
}

export async function updateInvoice(
    client: AxiosInstance,
    invoiceId: string,
    input: UpdateInvoiceRecordRequest
): Promise<InvoiceRecordSummary> {
    const response = await client.patch<InvoiceRecordSummary>(
        `/invoice-records/${invoiceId}`,
        input
    );
    return expectStatus(response, 200);
}

export async function markInvoiceException(
    client: AxiosInstance,
    invoiceId: string,
    input: MarkInvoiceExceptionRequest
): Promise<InvoiceRecordSummary> {
    const response = await client.post<InvoiceRecordSummary>(
        `/invoice-records/${invoiceId}:markException`,
        input
    );
    return expectStatus(response, 200);
}

export async function resolveInvoiceException(
    client: AxiosInstance,
    invoiceId: string,
    input: ResolveInvoiceExceptionRequest
): Promise<InvoiceRecordSummary> {
    const response = await client.post<InvoiceRecordSummary>(
        `/invoice-records/${invoiceId}:resolveException`,
        input
    );
    return expectStatus(response, 200);
}

export async function closeInvoiceRecord(
    client: AxiosInstance,
    invoiceId: string,
    input: CloseInvoiceRecordRequest
): Promise<InvoiceRecordSummary> {
    const response = await client.post<InvoiceRecordSummary>(
        `/invoice-records/${invoiceId}:close`,
        input
    );
    return expectStatus(response, 200);
}

export async function listPayments(
    client: AxiosInstance,
    projectId: string
): Promise<PaymentRecordSummary[]> {
    const response = await client.get<PaymentRecordSummary[]>(
        `/projects/${projectId}/payment-records`
    );
    return expectStatus(response, 200);
}

export async function createPayment(
    client: AxiosInstance,
    projectId: string,
    input: CreatePaymentRecordRequest
): Promise<PaymentRecordSummary> {
    const response = await client.post<PaymentRecordSummary>(
        `/projects/${projectId}/payment-records`,
        input
    );
    return expectStatus(response, 201);
}

export async function confirmPayment(
    client: AxiosInstance,
    paymentId: string,
    input: ConfirmPaymentRecordRequest
): Promise<PaymentRecordSummary> {
    const response = await client.post<PaymentRecordSummary>(
        `/payment-records/${paymentId}:confirm`,
        input
    );
    return expectStatus(response, 200);
}
