jest.mock('@mikro-orm/core', () => {
    const makeChain = () => {
        const chain: Record<string, unknown> = {};
        ['primary', 'nullable', 'length', 'defaultRaw', 'unique', 'fieldName', 'version', 'default', 'onCreate', 'onUpdate', '$type', 'precision', 'scale'].forEach((m) => {
            chain[m] = () => chain;
        });
        return chain;
    };
    const defineEntity = (_config: unknown) => ({ class: class {}, setClass: () => {} });
    defineEntity.properties = new Proxy({} as Record<string, unknown>, { get: () => makeChain });
    return { QueryOrder: { ASC: 'ASC', DESC: 'DESC' }, defineEntity };
});

import { UnprocessableEntityException } from '@nestjs/common';
import { ContractFinanceService } from './contract-finance.service';
import type { ContractFinanceRepository } from './contract-finance.repository';

const PROJECT_ID = '00000000-0000-4000-8000-000000000001';
const CONTRACT_ID = '30000000-0000-4000-8000-000000000001';
const RECEIPT_ID = '31000000-0000-4000-8000-000000000001';
const PAYMENT_ID = '32000000-0000-4000-8000-000000000001';
const USER_ID = '00000000-0000-4000-8000-000000000001';

const makeProject = () => ({
    id: PROJECT_ID
});

const makeContract = (overrides: Record<string, unknown> = {}) => ({
    id: CONTRACT_ID,
    projectId: PROJECT_ID,
    status: 'active',
    ...overrides
});

const makeReceipt = (overrides: Record<string, unknown> = {}) => ({
    id: RECEIPT_ID,
    contractId: CONTRACT_ID,
    projectId: PROJECT_ID,
    receiptAmount: '100000.00',
    receiptDate: new Date('2026-03-27T10:00:00Z'),
    sourceType: 'manual',
    status: 'pending-confirmation',
    confirmedAt: null,
    confirmedBy: null,
    rowVersion: 1,
    createdAt: new Date('2026-03-27T10:00:00Z'),
    updatedAt: new Date('2026-03-27T10:00:00Z'),
    ...overrides
});

const makePayment = (overrides: Record<string, unknown> = {}) => ({
    id: PAYMENT_ID,
    projectId: PROJECT_ID,
    contractId: CONTRACT_ID,
    paymentAmount: '70000.00',
    paymentDate: new Date('2026-03-27T10:00:00Z'),
    costCategory: 'implementation',
    sourceType: 'manual',
    status: 'recorded',
    confirmedAt: null,
    confirmedBy: null,
    rowVersion: 1,
    createdAt: new Date('2026-03-27T10:00:00Z'),
    updatedAt: new Date('2026-03-27T10:00:00Z'),
    ...overrides
});

describe('ContractFinanceService', () => {
    let service: ContractFinanceService;
    let repo: jest.Mocked<ContractFinanceRepository>;

    beforeEach(() => {
        repo = {
            findProjectById: jest.fn(),
            findContractById: jest.fn(),
            findReceiptsForContract: jest.fn(),
            findReceiptById: jest.fn(),
            createReceipt: jest.fn(),
            persistAndFlushReceipt: jest.fn(),
            flushReceipt: jest.fn(),
            findPaymentsForProject: jest.fn(),
            findPaymentById: jest.fn(),
            createPayment: jest.fn(),
            persistAndFlushPayment: jest.fn(),
            flushPayment: jest.fn(),
            findConfirmedReceiptsForProject: jest.fn(),
            findConfirmedPaymentsForProject: jest.fn()
        } as unknown as jest.Mocked<ContractFinanceRepository>;

        service = new ContractFinanceService(repo);
    });

    it('creates receipt for active contract', async () => {
        repo.findContractById.mockResolvedValue(makeContract() as never);
        repo.createReceipt.mockReturnValue(makeReceipt() as never);
        repo.persistAndFlushReceipt.mockResolvedValue(undefined);

        const result = await service.createReceipt(CONTRACT_ID, {
            receiptAmount: '100000.00',
            receiptDate: '2026-03-27T10:00:00.000Z',
            sourceType: 'manual'
        });

        expect(result.status).toBe('pending-confirmation');
        expect(repo.createReceipt).toHaveBeenCalledWith(expect.objectContaining({ projectId: PROJECT_ID }));
    });

    it('rejects receipt creation for inactive contract', async () => {
        repo.findContractById.mockResolvedValue(makeContract({ status: 'draft' }) as never);

        await expect(
            service.createReceipt(CONTRACT_ID, {
                receiptAmount: '100000.00',
                receiptDate: '2026-03-27T10:00:00.000Z'
            })
        ).rejects.toThrow(UnprocessableEntityException);
    });

    it('confirms pending receipt', async () => {
        const receipt = makeReceipt();
        repo.findReceiptById.mockResolvedValue(receipt as never);
        repo.flushReceipt.mockResolvedValue(undefined);

        const result = await service.confirmReceipt(CONTRACT_ID, RECEIPT_ID, USER_ID, { expectedVersion: 1 });

        expect(result.status).toBe('confirmed');
        expect(receipt.confirmedBy).toBe(USER_ID);
    });

    it('creates payment for project', async () => {
        repo.findProjectById.mockResolvedValue(makeProject() as never);
        repo.findContractById.mockResolvedValue(makeContract() as never);
        repo.createPayment.mockReturnValue(makePayment() as never);
        repo.persistAndFlushPayment.mockResolvedValue(undefined);

        const result = await service.createPayment(PROJECT_ID, {
            contractId: CONTRACT_ID,
            paymentAmount: '70000.00',
            paymentDate: '2026-03-27T10:00:00.000Z',
            costCategory: 'implementation',
            sourceType: 'manual'
        });

        expect(result.status).toBe('recorded');
    });

    it('confirms recorded payment', async () => {
        const payment = makePayment();
        repo.findPaymentById.mockResolvedValue(payment as never);
        repo.flushPayment.mockResolvedValue(undefined);

        const result = await service.confirmPayment(PROJECT_ID, PAYMENT_ID, USER_ID, { expectedVersion: 1 });

        expect(result.status).toBe('confirmed');
        expect(payment.confirmedBy).toBe(USER_ID);
    });
});
