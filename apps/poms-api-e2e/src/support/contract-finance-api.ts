import type { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import type {
    CloseInvoiceRecordRequest,
    ConfirmPaymentRecordRequest,
    ConfirmReceiptRecordRequest,
    CreateInvoiceRecordRequest,
    CreatePaymentRecordRequest,
    CreateReceiptRecordRequest,
    InvoiceRecordDetailView,
    InvoiceRecordSummary,
    MarkInvoiceExceptionRequest,
    PaymentRecordSummary,
    ReceiptRecordSummary,
    ResolveInvoiceExceptionRequest,
    UpdateInvoiceRecordRequest
} from './types';

export async function listReceipts(
    client: AxiosInstance,
    contractId: string
): Promise<ReceiptRecordSummary[]> {
    const response = await client.get<ReceiptRecordSummary[]>(
        `/contract-finance/contracts/${contractId}/receipts`
    );
    return expectStatus(response, 200);
}

export async function createReceipt(
    client: AxiosInstance,
    contractId: string,
    input: CreateReceiptRecordRequest
): Promise<ReceiptRecordSummary> {
    const response = await client.post<ReceiptRecordSummary>(
        `/contract-finance/contracts/${contractId}/receipts`,
        input
    );
    return expectStatus(response, 201);
}

export async function confirmReceipt(
    client: AxiosInstance,
    contractId: string,
    receiptId: string,
    input: ConfirmReceiptRecordRequest
): Promise<ReceiptRecordSummary> {
    const response = await client.post<ReceiptRecordSummary>(
        `/contract-finance/contracts/${contractId}/receipts/${receiptId}/confirm`,
        input
    );
    return expectStatus(response, 200);
}

export async function listInvoices(
    client: AxiosInstance,
    projectId: string
): Promise<InvoiceRecordSummary[]> {
    const response = await client.get<InvoiceRecordSummary[]>(
        `/contract-finance/projects/${projectId}/invoices`
    );
    return expectStatus(response, 200);
}

export async function getInvoice(
    client: AxiosInstance,
    invoiceId: string
): Promise<InvoiceRecordDetailView> {
    const response = await client.get<InvoiceRecordDetailView>(
        `/contract-finance/invoice-records/${invoiceId}`
    );
    return expectStatus(response, 200);
}

export async function createInvoice(
    client: AxiosInstance,
    projectId: string,
    input: CreateInvoiceRecordRequest
): Promise<InvoiceRecordSummary> {
    const response = await client.post<InvoiceRecordSummary>(
        `/contract-finance/projects/${projectId}/invoices`,
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
        `/contract-finance/invoice-records/${invoiceId}`,
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
        `/contract-finance/invoice-records/${invoiceId}/mark-exception`,
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
        `/contract-finance/invoice-records/${invoiceId}/resolve-exception`,
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
        `/contract-finance/invoice-records/${invoiceId}/close`,
        input
    );
    return expectStatus(response, 200);
}

export async function listPayments(
    client: AxiosInstance,
    projectId: string
): Promise<PaymentRecordSummary[]> {
    const response = await client.get<PaymentRecordSummary[]>(
        `/contract-finance/projects/${projectId}/payments`
    );
    return expectStatus(response, 200);
}

export async function createPayment(
    client: AxiosInstance,
    projectId: string,
    input: CreatePaymentRecordRequest
): Promise<PaymentRecordSummary> {
    const response = await client.post<PaymentRecordSummary>(
        `/contract-finance/projects/${projectId}/payments`,
        input
    );
    return expectStatus(response, 201);
}

export async function confirmPayment(
    client: AxiosInstance,
    projectId: string,
    paymentId: string,
    input: ConfirmPaymentRecordRequest
): Promise<PaymentRecordSummary> {
    const response = await client.post<PaymentRecordSummary>(
        `/contract-finance/projects/${projectId}/payments/${paymentId}/confirm`,
        input
    );
    return expectStatus(response, 200);
}
