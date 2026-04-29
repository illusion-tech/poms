import type { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import type { CreateCustomerRequest, CustomerSummary } from './types';

export function createCustomer(client: AxiosInstance, input: CreateCustomerRequest): Promise<CustomerSummary> {
    return client.post<CustomerSummary>('/customers', input).then((response) => expectStatus(response, 201));
}
