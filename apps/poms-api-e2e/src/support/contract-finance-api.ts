import type { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import type {
    ConfirmPaymentRecordRequest,
    ConfirmReceiptRecordRequest,
    CreatePaymentRecordRequest,
    CreateReceiptRecordRequest,
    PaymentRecordSummary,
    ReceiptRecordSummary
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
