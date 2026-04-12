import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { ContractFinanceService } from './contract-finance.service';
import type { ContractFinanceRepository } from './contract-finance.repository';

const PROJECT_ID = '00000000-0000-4000-8000-000000000001';
const CONTRACT_ID = '30000000-0000-4000-8000-000000000001';
const RECEIPT_ID = '31000000-0000-4000-8000-000000000001';
const INVOICE_ID = '31500000-0000-4000-8000-000000000001';
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

const makeInvoice = (overrides: Record<string, unknown> = {}) => ({
    id: INVOICE_ID,
    projectId: PROJECT_ID,
    contractId: CONTRACT_ID,
    invoiceType: 'output',
    invoiceNumber: 'INV-2026-0001',
    invoiceAmount: '188000.00',
    invoiceDate: new Date('2026-03-27T00:00:00Z'),
    status: 'draft',
    exceptionStatus: 'none',
    exceptionReason: null,
    exceptionResolution: null,
    closedAt: null,
    closeReason: null,
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
            findInvoicesForProject: jest.fn(),
            findInvoiceById: jest.fn(),
            createInvoice: jest.fn(),
            persistAndFlushInvoice: jest.fn(),
            flushInvoice: jest.fn(),
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

    it('creates input invoice without contract', async () => {
        repo.findProjectById.mockResolvedValue(makeProject() as never);
        repo.createInvoice.mockReturnValue(makeInvoice({ contractId: null, invoiceType: 'input' }) as never);
        repo.persistAndFlushInvoice.mockResolvedValue(undefined);

        const result = await service.createInvoice(PROJECT_ID, {
            invoiceType: 'input',
            contractId: null,
            invoiceNumber: ' AP-2026-0001 ',
            invoiceAmount: '188000.00',
            invoiceDate: '2026-03-27'
        });

        expect(result.contractId).toBeNull();
        expect(repo.createInvoice).toHaveBeenCalledWith(expect.objectContaining({ contractId: null, status: 'draft' }));
    });

    it('rejects output invoice without contract', async () => {
        repo.findProjectById.mockResolvedValue(makeProject() as never);

        await expect(
            service.createInvoice(PROJECT_ID, {
                invoiceType: 'output',
                contractId: null,
                invoiceNumber: 'INV-2026-0002',
                invoiceAmount: '188000.00',
                invoiceDate: '2026-03-27'
            })
        ).rejects.toThrow(UnprocessableEntityException);
    });

    it('updates invoice after version check', async () => {
        const invoice = makeInvoice();
        repo.findInvoiceById.mockResolvedValue(invoice as never);
        repo.flushInvoice.mockResolvedValue(undefined);

        const result = await service.updateInvoice(INVOICE_ID, {
            invoiceAmount: '199000.00',
            status: 'issued',
            expectedVersion: 1
        });

        expect(result.status).toBe('issued');
        expect(invoice.invoiceAmount).toBe('199000.00');
    });

    it('rejects invoice update while exception is open', async () => {
        repo.findInvoiceById.mockResolvedValue(
            makeInvoice({ status: 'exception', exceptionStatus: 'open' }) as never
        );

        await expect(
            service.updateInvoice(INVOICE_ID, {
                invoiceAmount: '199000.00',
                expectedVersion: 1
            })
        ).rejects.toThrow(UnprocessableEntityException);
    });

    it('marks resolves and closes invoice exception', async () => {
        const invoice = makeInvoice();
        repo.findInvoiceById
            .mockResolvedValueOnce(invoice as never)
            .mockResolvedValueOnce(invoice as never)
            .mockResolvedValueOnce(invoice as never);
        repo.flushInvoice.mockResolvedValue(undefined);

        const marked = await service.markInvoiceException(INVOICE_ID, {
            reason: 'amount mismatch',
            comment: 'supplier email attached',
            expectedVersion: 1
        });
        expect(marked.status).toBe('exception');
        expect(marked.exceptionStatus).toBe('open');

        invoice.rowVersion = 2;
        const resolved = await service.resolveInvoiceException(INVOICE_ID, {
            resolution: 'verified with supplier',
            comment: 'difference accepted',
            expectedVersion: 2
        });
        expect(resolved.exceptionStatus).toBe('resolved');

        invoice.rowVersion = 3;
        const closed = await service.closeInvoiceRecord(INVOICE_ID, {
            reason: 'archived',
            comment: 'ready for downstream mapping',
            expectedVersion: 3
        });
        expect(closed.status).toBe('closed');
        expect(invoice.closedAt).toBeInstanceOf(Date);
    });

    it('rejects stale invoice version', async () => {
        repo.findInvoiceById.mockResolvedValue(makeInvoice({ rowVersion: 3 }) as never);

        await expect(
            service.markInvoiceException(INVOICE_ID, {
                reason: 'amount mismatch',
                expectedVersion: 2
            })
        ).rejects.toThrow(ConflictException);
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
