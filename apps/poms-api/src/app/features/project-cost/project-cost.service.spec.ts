import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ContractFinanceRepository } from '../contract-finance/contract-finance.repository';
import { ExpenseRecordRepository, InternalCostRateVersionRepository, ProjectActualCostRecordRepository } from './project-cost.repository';

jest.mock('@mikro-orm/nestjs', () => ({
    InjectRepository: () => () => undefined
}));

import { ProjectCostService } from './project-cost.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const PROJECT_ID = '22222222-2222-4222-8222-222222222222';
const RATE_VERSION_ID = '33333333-3333-4333-8333-333333333333';
const RECORD_ID = '44444444-4444-4444-8444-444444444444';
const PAYMENT_RECORD_ID = '55555555-5555-4555-8555-555555555555';
const REPLACEMENT_RECORD_ID = '66666666-6666-4666-8666-666666666666';
const INVOICE_RECORD_ID = '77777777-7777-4777-8777-777777777777';
const EXPENSE_RECORD_ID = '88888888-8888-4888-8888-888888888888';
const CONTRACT_ID = '99999999-9999-4999-8999-999999999999';
const PAYABLE_RECORD_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeRateVersion(overrides: Record<string, unknown> = {}) {
    return {
        id: RATE_VERSION_ID,
        rateKey: 'ROLE:dev:DAY',
        version: 1,
        status: 'active',
        isCurrent: true,
        rateScopeType: 'ROLE',
        personId: null,
        roleCode: 'dev',
        rateUnit: 'DAY',
        rateValue: '1000',
        currency: 'CNY',
        effectiveFrom: new Date('2023-01-01T00:00:00.000Z'),
        effectiveTo: null,
        rowVersion: 1,
        ...overrides
    };
}

function makePaymentRecord(overrides: Record<string, unknown> = {}) {
    return {
        id: PAYMENT_RECORD_ID,
        projectId: PROJECT_ID,
        currency: 'CNY',
        amountExcludingTax: '8888.50',
        taxAmount: null,
        amountIncludingTax: null,
        paymentDate: new Date('2023-03-18T08:00:00.000Z'),
        costCategory: 'vendor-payment',
        sourceType: 'manual',
        status: 'confirmed',
        confirmedAt: new Date('2023-03-19T09:00:00.000Z'),
        confirmedBy: USER_ID,
        rowVersion: 3,
        ...overrides
    };
}

function makeInvoiceRecord(overrides: Record<string, unknown> = {}) {
    return {
        id: INVOICE_RECORD_ID,
        projectId: PROJECT_ID,
        contractId: null,
        invoiceType: 'input',
        invoiceNumber: 'INV-2026-0001',
        invoiceAmount: '3210.50',
        invoiceDate: '2023-04-02',
        status: 'verified',
        exceptionStatus: 'none',
        updatedAt: new Date('2023-04-03T10:00:00.000Z'),
        rowVersion: 2,
        ...overrides
    };
}

function makeProject(overrides: Record<string, unknown> = {}) {
    return {
        id: PROJECT_ID,
        ...overrides
    };
}

function makeContract(overrides: Record<string, unknown> = {}) {
    return {
        id: CONTRACT_ID,
        projectId: PROJECT_ID,
        ...overrides
    };
}

function makeExpenseRecord(overrides: Record<string, unknown> = {}) {
    return {
        id: EXPENSE_RECORD_ID,
        projectId: PROJECT_ID,
        contractId: CONTRACT_ID,
        expenseCategory: 'travel',
        expenseDescription: 'Taxi reimbursement',
        expenseDate: '2023-05-10',
        currency: 'CNY',
        amountIncludingTax: '1234.5600',
        taxAmount: '123.4500',
        amountExcludingTax: '1111.1100',
        sourceType: 'manual',
        status: 'recorded',
        evidenceSummary: 'receipt attached',
        attachmentCount: 2,
        confirmedAt: null,
        confirmedBy: null,
        voidedAt: null,
        voidReason: null,
        rowVersion: 1,
        createdAt: new Date('2023-05-10T09:00:00.000Z'),
        updatedAt: new Date('2023-05-10T09:00:00.000Z'),
        ...overrides
    };
}

function makePayableRecord(overrides: Record<string, unknown> = {}) {
    return {
        id: PAYABLE_RECORD_ID,
        projectId: PROJECT_ID,
        contractId: CONTRACT_ID,
        vendorName: 'Acme Supplier',
        costCategory: 'hardware',
        payableDescription: 'Server procurement',
        currency: 'CNY',
        amountExcludingTax: '4567.8900',
        taxAmount: null,
        amountIncludingTax: null,
        expectedPaymentDate: '2023-06-15',
        status: 'recorded',
        evidenceSummary: 'quotation approved',
        attachmentCount: 1,
        rowVersion: 2,
        createdAt: new Date('2023-06-01T10:00:00.000Z'),
        updatedAt: new Date('2023-06-01T10:00:00.000Z'),
        ...overrides
    };
}

describe('ProjectCostService', () => {
    let service: ProjectCostService;
    let expenseRecordRepository: jest.Mocked<ExpenseRecordRepository>;
    let internalCostRateVersionRepository: jest.Mocked<InternalCostRateVersionRepository>;
    let projectActualCostRecordRepository: jest.Mocked<ProjectActualCostRecordRepository>;
    let contractFinanceRepository: jest.Mocked<ContractFinanceRepository>;

    beforeEach(() => {
        const mockExpenseRecordRepository = {
            create: jest.fn((input) => ({
                ...makeExpenseRecord(),
                id: EXPENSE_RECORD_ID,
                rowVersion: 1,
                ...input
            })),
            save: jest.fn(),
            findByProjectId: jest.fn(),
            findById: jest.fn()
        };

        const mockInternalCostRateVersionRepository = {
            create: jest.fn((input) => ({ id: RATE_VERSION_ID, ...input })),
            save: jest.fn(),
            saveAll: jest.fn(),
            findActiveVersionByRateKey: jest.fn(),
            findActiveVersion: jest.fn(),
            findCurrentByRateKey: jest.fn(),
            findOverlappingActiveVersion: jest.fn(),
            findById: jest.fn()
        };

        const mockProjectActualCostRecordRepository = {
            create: jest.fn((input) => ({ id: RECORD_ID, ...input })),
            save: jest.fn(),
            saveAll: jest.fn(),
            findById: jest.fn(),
            findByProjectId: jest.fn(),
            findCurrentEffectiveBySource: jest.fn(),
            findReplacementBySupersedesRecordId: jest.fn()
        };

        const mockContractFinanceRepository = {
            findProjectById: jest.fn(),
            findContractById: jest.fn(),
            findPaymentById: jest.fn(),
            findInvoiceById: jest.fn(),
            findPayableById: jest.fn()
        };

        expenseRecordRepository = mockExpenseRecordRepository as unknown as jest.Mocked<ExpenseRecordRepository>;
        internalCostRateVersionRepository = mockInternalCostRateVersionRepository as unknown as jest.Mocked<InternalCostRateVersionRepository>;
        projectActualCostRecordRepository = mockProjectActualCostRecordRepository as unknown as jest.Mocked<ProjectActualCostRecordRepository>;
        contractFinanceRepository = mockContractFinanceRepository as unknown as jest.Mocked<ContractFinanceRepository>;
        service = new ProjectCostService(
            expenseRecordRepository,
            internalCostRateVersionRepository,
            projectActualCostRecordRepository,
            contractFinanceRepository
        );
    });

    describe('publishInternalCostRateVersion', () => {
        it('publishes the first active cost rate version with a stable rate key', async () => {
            internalCostRateVersionRepository.findCurrentByRateKey.mockResolvedValue(null);
            internalCostRateVersionRepository.findOverlappingActiveVersion.mockResolvedValue(null);

            const result = await service.publishInternalCostRateVersion(
                {
                    rateScopeType: 'ROLE',
                    roleCode: 'dev',
                    rateUnit: 'DAY',
                    rateValue: '1000',
                    currency: 'CNY',
                    effectiveFrom: '2023-01-01'
                },
                USER_ID
            );

            expect(internalCostRateVersionRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    rateKey: 'ROLE:dev:DAY',
                    version: 1,
                    status: 'active',
                    isCurrent: true,
                    effectiveFrom: '2023-01-01'
                })
            );
            expect(internalCostRateVersionRepository.save).toHaveBeenCalled();
            expect(result.resultStatus).toBe('success');
            expect(result.targetId).toBe(RATE_VERSION_ID);
        });

        it('blocks publishing a new current version without an explicit supersedes chain', async () => {
            internalCostRateVersionRepository.findCurrentByRateKey.mockResolvedValue(makeRateVersion() as never);

            await expect(
                service.publishInternalCostRateVersion(
                    {
                        rateScopeType: 'ROLE',
                        roleCode: 'dev',
                        rateUnit: 'DAY',
                        rateValue: '1200',
                        currency: 'CNY',
                        effectiveFrom: '2023-02-01'
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('registerPaymentFactCostRecord', () => {
        it('registers a confirmed payment as a PAYMENT_FACT cost record', async () => {
            contractFinanceRepository.findPaymentById.mockResolvedValue(makePaymentRecord() as never);
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue(null);

            const result = await service.registerPaymentFactCostRecord(
                {
                    paymentRecordId: PAYMENT_RECORD_ID,
                    projectId: PROJECT_ID,
                    costDescription: 'confirmed vendor payment',
                    evidenceSummary: 'bank slip attached',
                    expectedVersion: 3
                },
                USER_ID
            );

            expect(projectActualCostRecordRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    costType: 'PAYMENT_FACT',
                    costSubtype: 'vendor-payment',
                    occurredOn: '2023-03-18',
                    recordStatus: 'CONFIRMED',
                    amountExcludingTax: '8888.5000',
                    amountIncludingTax: null,
                    sourceType: 'PAYMENT_RECORD',
                    sourceId: PAYMENT_RECORD_ID,
                    sourceRefNo: PAYMENT_RECORD_ID,
                    evidenceSummary: 'bank slip attached'
                })
            );
            expect(projectActualCostRecordRepository.save).toHaveBeenCalled();
            expect(result.businessStatusAfter).toBe('CONFIRMED');
            expect(result.targetId).toBe(RECORD_ID);
        });

        it('blocks duplicate current PAYMENT_FACT mapping for the same payment source', async () => {
            contractFinanceRepository.findPaymentById.mockResolvedValue(makePaymentRecord() as never);
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue({ id: RECORD_ID } as never);

            await expect(
                service.registerPaymentFactCostRecord(
                    {
                        paymentRecordId: PAYMENT_RECORD_ID,
                        projectId: PROJECT_ID
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });

        it('blocks mapping when payment source is not confirmed', async () => {
            contractFinanceRepository.findPaymentById.mockResolvedValue(makePaymentRecord({ status: 'recorded' }) as never);
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue(null);

            await expect(
                service.registerPaymentFactCostRecord(
                    {
                        paymentRecordId: PAYMENT_RECORD_ID,
                        projectId: PROJECT_ID
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('registerInvoiceCostRecord', () => {
        it('registers a verified input invoice as an INVOICE cost record', async () => {
            contractFinanceRepository.findInvoiceById.mockResolvedValue(makeInvoiceRecord() as never);
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue(null);

            const result = await service.registerInvoiceCostRecord(
                {
                    invoiceRecordId: INVOICE_RECORD_ID,
                    projectId: PROJECT_ID,
                    costDescription: 'mapped from verified invoice',
                    evidenceSummary: 'invoice pdf archived',
                    taxImpactSummary: 'vat pending deduction',
                    expectedVersion: 2
                },
                USER_ID
            );

            expect(projectActualCostRecordRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    costType: 'INVOICE',
                    costSubtype: 'input',
                    occurredOn: '2023-04-02',
                    recordStatus: 'CONFIRMED',
                    amountIncludingTax: '3210.5000',
                    sourceType: 'INVOICE_RECORD',
                    sourceId: INVOICE_RECORD_ID,
                    sourceRefNo: 'INV-2026-0001',
                    taxImpactSummary: 'vat pending deduction'
                })
            );
            expect(projectActualCostRecordRepository.save).toHaveBeenCalled();
            expect(result.businessStatusAfter).toBe('CONFIRMED');
        });

        it('blocks mapping for non-verified invoice status', async () => {
            contractFinanceRepository.findInvoiceById.mockResolvedValue(
                makeInvoiceRecord({ status: 'received' }) as never
            );
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue(null);

            await expect(
                service.registerInvoiceCostRecord(
                    {
                        invoiceRecordId: INVOICE_RECORD_ID,
                        projectId: PROJECT_ID
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });

        it('blocks duplicate current INVOICE mapping for the same invoice source', async () => {
            contractFinanceRepository.findInvoiceById.mockResolvedValue(makeInvoiceRecord() as never);
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue({ id: RECORD_ID } as never);

            await expect(
                service.registerInvoiceCostRecord(
                    {
                        invoiceRecordId: INVOICE_RECORD_ID,
                        projectId: PROJECT_ID
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('registerExpenseCostRecord', () => {
        it('registers a confirmed expense as an EXPENSE cost record', async () => {
            expenseRecordRepository.findById.mockResolvedValue(
                makeExpenseRecord({
                    status: 'confirmed',
                    confirmedAt: new Date('2023-05-11T10:00:00.000Z'),
                    confirmedBy: USER_ID
                }) as never
            );
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue(null);

            const result = await service.registerExpenseCostRecord(
                {
                    expenseRecordId: EXPENSE_RECORD_ID,
                    projectId: PROJECT_ID,
                    costDescription: 'mapped from confirmed expense',
                    evidenceSummary: 'receipt archived',
                    taxImpactSummary: 'manual expense pending tax review',
                    expectedVersion: 1
                },
                USER_ID
            );

            expect(projectActualCostRecordRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    costType: 'EXPENSE',
                    costSubtype: 'travel',
                    occurredOn: '2023-05-10',
                    recordStatus: 'CONFIRMED',
                    amountIncludingTax: '1234.5600',
                    amountExcludingTax: '1111.1100',
                    taxCostAmount: '123.4500',
                    sourceType: 'EXPENSE_RECORD',
                    sourceId: EXPENSE_RECORD_ID,
                    sourceRefNo: EXPENSE_RECORD_ID,
                    evidenceSummary: 'receipt archived',
                    taxImpactSummary: 'manual expense pending tax review'
                })
            );
            expect(projectActualCostRecordRepository.save).toHaveBeenCalled();
            expect(result.businessStatusAfter).toBe('CONFIRMED');
        });

        it('blocks mapping when expense source is not confirmed', async () => {
            expenseRecordRepository.findById.mockResolvedValue(makeExpenseRecord({ status: 'recorded' }) as never);
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue(null);

            await expect(
                service.registerExpenseCostRecord(
                    {
                        expenseRecordId: EXPENSE_RECORD_ID,
                        projectId: PROJECT_ID
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });

        it('blocks duplicate current EXPENSE mapping for the same expense source', async () => {
            expenseRecordRepository.findById.mockResolvedValue(
                makeExpenseRecord({ status: 'confirmed', confirmedAt: new Date(), confirmedBy: USER_ID }) as never
            );
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue({ id: RECORD_ID } as never);

            await expect(
                service.registerExpenseCostRecord(
                    {
                        expenseRecordId: EXPENSE_RECORD_ID,
                        projectId: PROJECT_ID
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('registerProcurementCostRecord', () => {
        it('registers a formal payable as a PROCUREMENT cost record', async () => {
            contractFinanceRepository.findPayableById.mockResolvedValue(makePayableRecord() as never);
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue(null);

            const result = await service.registerProcurementCostRecord(
                {
                    payableRecordId: PAYABLE_RECORD_ID,
                    projectId: PROJECT_ID,
                    costDescription: 'mapped from approved commitment',
                    evidenceSummary: 'quotation archived',
                    taxImpactSummary: 'tax impact pending invoice',
                    expectedVersion: 2
                },
                USER_ID
            );

            expect(projectActualCostRecordRepository.findCurrentEffectiveBySource).toHaveBeenCalledWith(
                'PAYABLE_RECORD',
                PAYABLE_RECORD_ID,
                ['REGISTERED', 'CONFIRMED', 'INCLUDED']
            );
            expect(projectActualCostRecordRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    costType: 'PROCUREMENT',
                    costSubtype: 'hardware',
                    occurredOn: '2023-06-15',
                    recordStatus: 'REGISTERED',
                    amountExcludingTax: '4567.8900',
                    amountIncludingTax: null,
                    sourceType: 'PAYABLE_RECORD',
                    sourceId: PAYABLE_RECORD_ID,
                    sourceRefNo: PAYABLE_RECORD_ID,
                    evidenceSummary: 'quotation archived',
                    taxImpactSummary: 'tax impact pending invoice'
                })
            );
            expect(result.businessStatusAfter).toBe('REGISTERED');
        });

        it('blocks procurement mapping for non-formal payable states', async () => {
            contractFinanceRepository.findPayableById.mockResolvedValue(
                makePayableRecord({ status: 'draft' }) as never
            );
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue(null);

            await expect(
                service.registerProcurementCostRecord(
                    {
                        payableRecordId: PAYABLE_RECORD_ID,
                        projectId: PROJECT_ID
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('expense records', () => {
        it('creates an expense record after validating project and contract ownership', async () => {
            contractFinanceRepository.findProjectById.mockResolvedValue(makeProject() as never);
            contractFinanceRepository.findContractById.mockResolvedValue(makeContract() as never);

            const result = await service.createExpenseRecord(
                PROJECT_ID,
                {
                    contractId: CONTRACT_ID,
                    expenseCategory: 'travel',
                    expenseDescription: ' Taxi reimbursement ',
                    expenseDate: '2023-05-10',
                    amountIncludingTax: '1234.56',
                    taxAmount: '123.45',
                    amountExcludingTax: '1111.11',
                    evidenceSummary: 'receipt attached',
                    attachmentCount: 2
                },
                USER_ID
            );

            expect(expenseRecordRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectId: PROJECT_ID,
                    contractId: CONTRACT_ID,
                    expenseCategory: 'travel',
                    expenseDescription: 'Taxi reimbursement',
                    expenseDate: '2023-05-10',
                    amountIncludingTax: '1234.56',
                    taxAmount: '123.45',
                    amountExcludingTax: '1111.11',
                    sourceType: 'manual',
                    status: 'recorded'
                })
            );
            expect(expenseRecordRepository.save).toHaveBeenCalled();
            expect(result.status).toBe('recorded');
            expect(result.contractId).toBe(CONTRACT_ID);
        });

        it('rejects inconsistent expense amount split', async () => {
            contractFinanceRepository.findProjectById.mockResolvedValue(makeProject() as never);

            await expect(
                service.createExpenseRecord(
                    PROJECT_ID,
                    {
                        expenseCategory: 'travel',
                        expenseDescription: 'Taxi reimbursement',
                        expenseDate: '2023-05-10',
                        amountIncludingTax: '1234.56',
                        taxAmount: '100.00',
                        amountExcludingTax: '1000.00'
                    },
                    USER_ID
                )
            ).rejects.toThrow(UnprocessableEntityException);
        });

        it('updates a recorded expense record', async () => {
            expenseRecordRepository.findById.mockResolvedValue(makeExpenseRecord() as never);
            contractFinanceRepository.findProjectById.mockResolvedValue(makeProject() as never);

            const result = await service.updateExpenseRecord(EXPENSE_RECORD_ID, {
                expenseDescription: 'Updated taxi reimbursement',
                attachmentCount: 3,
                expectedVersion: 1
            });

            expect(expenseRecordRepository.save).toHaveBeenCalled();
            expect(result.expenseDescription).toBe('Updated taxi reimbursement');
            expect(result.attachmentCount).toBe(3);
        });

        it('confirms a recorded expense record', async () => {
            expenseRecordRepository.findById.mockResolvedValue(makeExpenseRecord() as never);

            const result = await service.confirmExpenseRecord(EXPENSE_RECORD_ID, USER_ID, {
                expectedVersion: 1
            });

            expect(expenseRecordRepository.save).toHaveBeenCalled();
            expect(result.status).toBe('confirmed');
            expect(result.confirmedBy).toBe(USER_ID);
        });

        it('blocks updating a confirmed expense record', async () => {
            expenseRecordRepository.findById.mockResolvedValue(makeExpenseRecord({ status: 'confirmed' }) as never);

            await expect(
                service.updateExpenseRecord(EXPENSE_RECORD_ID, {
                    expenseDescription: 'cannot edit',
                    expectedVersion: 1
                })
            ).rejects.toThrow('can no longer be updated');
        });

        it('voids an expense record with appended reason/comment', async () => {
            expenseRecordRepository.findById.mockResolvedValue(
                makeExpenseRecord({ status: 'confirmed', confirmedAt: new Date(), confirmedBy: USER_ID }) as never
            );

            const result = await service.voidExpenseRecord(EXPENSE_RECORD_ID, {
                reason: 'duplicate',
                comment: 're-entered from approved claim',
                expectedVersion: 1
            });

            expect(expenseRecordRepository.save).toHaveBeenCalled();
            expect(result.status).toBe('voided');
            expect(result.voidReason).toBe('duplicate: re-entered from approved claim');
        });

        it('blocks voiding a mapped expense record', async () => {
            expenseRecordRepository.findById.mockResolvedValue(
                makeExpenseRecord({ status: 'confirmed', confirmedAt: new Date(), confirmedBy: USER_ID }) as never
            );
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue({ id: RECORD_ID } as never);

            await expect(
                service.voidExpenseRecord(EXPENSE_RECORD_ID, {
                    reason: 'duplicate',
                    expectedVersion: 1
                })
            ).rejects.toThrow(UnprocessableEntityException);
        });

        it('hides expense actions once a current project cost mapping exists', async () => {
            expenseRecordRepository.findById.mockResolvedValue(
                makeExpenseRecord({ status: 'confirmed', confirmedAt: new Date(), confirmedBy: USER_ID }) as never
            );
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue({ id: RECORD_ID } as never);

            const result = await service.getExpenseRecordDetail(EXPENSE_RECORD_ID);

            expect(result.allowedActions).toEqual([]);
        });
    });

    describe('listProjectActualCostRecords', () => {
        it('returns mapped summary rows for project actual cost query', async () => {
            projectActualCostRecordRepository.findByProjectId.mockResolvedValue([
                {
                    id: RECORD_ID,
                    projectId: PROJECT_ID,
                    recordNo: 'PAYMENT-1',
                    costType: 'PAYMENT_FACT',
                    costSubtype: 'vendor-payment',
                    occurredOn: '2023-03-18',
                    accountingPeriod: null,
                    registeredAt: new Date('2023-03-19T09:00:00.000Z'),
                    confirmedAt: new Date('2023-03-19T09:00:00.000Z'),
                    includedAt: null,
                    executionStageCode: null,
                    stageDerivedFromType: null,
                    stageDerivedFromId: null,
                    stageDerivedAt: null,
                    stageLockedAt: null,
                    currency: 'CNY',
                    amountExcludingTax: '8888.5000',
                    taxCostAmount: null,
                    amountIncludingTax: null,
                    recordStatus: 'CONFIRMED',
                    isIncludedInProjectCost: false,
                    isHighRisk: false,
                    sourceType: 'PAYMENT_RECORD',
                    sourceId: PAYMENT_RECORD_ID,
                    sourceRefNo: PAYMENT_RECORD_ID,
                    evidenceSummary: 'bank slip attached',
                    attachmentCount: 0,
                    registeredBy: USER_ID,
                    confirmedBy: USER_ID,
                    includedBy: null,
                    ownerRole: null,
                    costDescription: 'confirmed vendor payment',
                    taxImpactSummary: null,
                    riskNote: null,
                    supersedesRecordId: null,
                    voidReason: null,
                    rowVersion: 1,
                    createdAt: new Date('2023-03-19T09:00:00.000Z'),
                    updatedAt: new Date('2023-03-19T09:00:00.000Z')
                }
            ] as never);

            const result = await service.listProjectActualCostRecords(PROJECT_ID, { sourceType: 'PAYMENT_RECORD' });

            expect(projectActualCostRecordRepository.findByProjectId).toHaveBeenCalledWith(PROJECT_ID, { sourceType: 'PAYMENT_RECORD' });
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(
                expect.objectContaining({
                    id: RECORD_ID,
                    costType: 'PAYMENT_FACT',
                    sourceType: 'PAYMENT_RECORD',
                    sourceId: PAYMENT_RECORD_ID,
                    amountExcludingTax: '8888.5000',
                    amountIncludingTax: null
                })
            );
        });
    });

    describe('getProjectActualCostRecordDetail', () => {
        it('returns labor detail with replacement chain and allowed actions', async () => {
            projectActualCostRecordRepository.findById.mockResolvedValue(
                {
                    id: RECORD_ID,
                    projectId: PROJECT_ID,
                    recordNo: 'LABOR-1',
                    costType: 'LABOR',
                    costSubtype: null,
                    occurredOn: '2023-01-01',
                    accountingPeriod: null,
                    registeredAt: new Date('2023-01-31T12:00:00.000Z'),
                    confirmedAt: null,
                    includedAt: null,
                    executionStageCode: null,
                    stageDerivedFromType: null,
                    stageDerivedFromId: null,
                    stageDerivedAt: null,
                    stageLockedAt: null,
                    currency: 'CNY',
                    amountExcludingTax: '20000.0000',
                    taxCostAmount: '0.0000',
                    amountIncludingTax: '20000.0000',
                    recordStatus: 'REGISTERED',
                    isIncludedInProjectCost: false,
                    isHighRisk: false,
                    sourceType: 'LABOR',
                    sourceId: RATE_VERSION_ID,
                    sourceRefNo: 'ROLE:dev:DAY',
                    evidenceSummary: null,
                    attachmentCount: 0,
                    registeredBy: USER_ID,
                    confirmedBy: null,
                    includedBy: null,
                    ownerRole: null,
                    costDescription: null,
                    taxImpactSummary: null,
                    riskNote: null,
                    supersedesRecordId: null,
                    voidReason: null,
                    laborPersonId: null,
                    laborRole: 'dev',
                    laborPeriodType: 'MONTH',
                    laborPeriodStart: '2023-01-01',
                    laborPeriodEnd: '2023-01-31',
                    actualHours: null,
                    actualPersonDays: '20',
                    internalCostRate: '1000.0000',
                    laborAmount: '20000.0000',
                    workSummary: 'delivery support',
                    deliveryStage: null,
                    rateVersionId: RATE_VERSION_ID,
                    rowVersion: 1,
                    createdAt: new Date('2023-01-31T12:00:00.000Z'),
                    updatedAt: new Date('2023-01-31T12:00:00.000Z')
                } as never
            );
            internalCostRateVersionRepository.findById.mockResolvedValue(makeRateVersion() as never);
            projectActualCostRecordRepository.findReplacementBySupersedesRecordId.mockResolvedValue({ id: REPLACEMENT_RECORD_ID } as never);

            const result = await service.getProjectActualCostRecordDetail(RECORD_ID);

            expect(result.allowedActions).toEqual(['replace']);
            expect(result.supersedesSummary).toBe(`Replaced by ${REPLACEMENT_RECORD_ID}`);
            expect(result.measurementBasisSummary).toBe('20d x 1000.0000 CNY');
            expect(result.sourceStatusSummary).toBe('InternalCostRateVersion:active');
        });

        it('throws NotFoundException when detail target is missing', async () => {
            projectActualCostRecordRepository.findById.mockResolvedValue(null);

            await expect(service.getProjectActualCostRecordDetail(RECORD_ID)).rejects.toThrow(NotFoundException);
        });

        it('returns invoice detail with source summary', async () => {
            projectActualCostRecordRepository.findById.mockResolvedValue(
                {
                    id: RECORD_ID,
                    projectId: PROJECT_ID,
                    recordNo: 'INVOICE-1',
                    costType: 'INVOICE',
                    costSubtype: 'input',
                    occurredOn: '2023-04-02',
                    accountingPeriod: null,
                    registeredAt: new Date('2023-04-03T10:00:00.000Z'),
                    confirmedAt: new Date('2023-04-03T10:00:00.000Z'),
                    includedAt: null,
                    executionStageCode: null,
                    stageDerivedFromType: null,
                    stageDerivedFromId: null,
                    stageDerivedAt: null,
                    stageLockedAt: null,
                    currency: 'CNY',
                    amountExcludingTax: null,
                    taxCostAmount: null,
                    amountIncludingTax: '3210.5000',
                    recordStatus: 'CONFIRMED',
                    isIncludedInProjectCost: false,
                    isHighRisk: false,
                    sourceType: 'INVOICE_RECORD',
                    sourceId: INVOICE_RECORD_ID,
                    sourceRefNo: 'INV-2026-0001',
                    evidenceSummary: 'invoice pdf archived',
                    attachmentCount: 0,
                    registeredBy: USER_ID,
                    confirmedBy: USER_ID,
                    includedBy: null,
                    ownerRole: null,
                    costDescription: 'mapped from verified invoice',
                    taxImpactSummary: 'vat pending deduction',
                    riskNote: null,
                    supersedesRecordId: null,
                    voidReason: null,
                    laborPersonId: null,
                    laborRole: null,
                    laborPeriodType: null,
                    laborPeriodStart: null,
                    laborPeriodEnd: null,
                    actualHours: null,
                    actualPersonDays: null,
                    internalCostRate: null,
                    laborAmount: null,
                    workSummary: null,
                    deliveryStage: null,
                    rateVersionId: null,
                    rowVersion: 1,
                    createdAt: new Date('2023-04-03T10:00:00.000Z'),
                    updatedAt: new Date('2023-04-03T10:00:00.000Z')
                } as never
            );
            contractFinanceRepository.findInvoiceById.mockResolvedValue(makeInvoiceRecord() as never);
            projectActualCostRecordRepository.findReplacementBySupersedesRecordId.mockResolvedValue(null);

            const result = await service.getProjectActualCostRecordDetail(RECORD_ID);

            expect(result.allowedActions).toEqual([]);
            expect(result.sourceStatusSummary).toBe('InvoiceRecord:verified/none');
            expect(result.effectivePeriodSummary).toBe('2023-04-02');
            expect(result.measurementBasisSummary).toBe('3210.5000 CNY @ 2023-04-02');
        });

        it('returns expense detail with source summary', async () => {
            projectActualCostRecordRepository.findById.mockResolvedValue(
                {
                    id: RECORD_ID,
                    projectId: PROJECT_ID,
                    recordNo: 'EXPENSE-1',
                    costType: 'EXPENSE',
                    costSubtype: 'travel',
                    occurredOn: '2023-05-10',
                    accountingPeriod: null,
                    registeredAt: new Date('2023-05-11T10:00:00.000Z'),
                    confirmedAt: new Date('2023-05-11T10:00:00.000Z'),
                    includedAt: null,
                    executionStageCode: null,
                    stageDerivedFromType: null,
                    stageDerivedFromId: null,
                    stageDerivedAt: null,
                    stageLockedAt: null,
                    currency: 'CNY',
                    amountExcludingTax: '1111.1100',
                    taxCostAmount: '123.4500',
                    amountIncludingTax: '1234.5600',
                    recordStatus: 'CONFIRMED',
                    isIncludedInProjectCost: false,
                    isHighRisk: false,
                    sourceType: 'EXPENSE_RECORD',
                    sourceId: EXPENSE_RECORD_ID,
                    sourceRefNo: EXPENSE_RECORD_ID,
                    evidenceSummary: 'receipt archived',
                    attachmentCount: 2,
                    registeredBy: USER_ID,
                    confirmedBy: USER_ID,
                    includedBy: null,
                    ownerRole: null,
                    costDescription: 'mapped from confirmed expense',
                    taxImpactSummary: 'manual expense pending tax review',
                    riskNote: null,
                    supersedesRecordId: null,
                    voidReason: null,
                    laborPersonId: null,
                    laborRole: null,
                    laborPeriodType: null,
                    laborPeriodStart: null,
                    laborPeriodEnd: null,
                    actualHours: null,
                    actualPersonDays: null,
                    internalCostRate: null,
                    laborAmount: null,
                    workSummary: null,
                    deliveryStage: null,
                    rateVersionId: null,
                    rowVersion: 1,
                    createdAt: new Date('2023-05-11T10:00:00.000Z'),
                    updatedAt: new Date('2023-05-11T10:00:00.000Z')
                } as never
            );
            expenseRecordRepository.findById.mockResolvedValue(
                makeExpenseRecord({ status: 'confirmed', confirmedAt: new Date(), confirmedBy: USER_ID }) as never
            );
            projectActualCostRecordRepository.findReplacementBySupersedesRecordId.mockResolvedValue(null);

            const result = await service.getProjectActualCostRecordDetail(RECORD_ID);

            expect(result.allowedActions).toEqual([]);
            expect(result.sourceStatusSummary).toBe('ExpenseRecord:confirmed');
            expect(result.effectivePeriodSummary).toBe('2023-05-10');
            expect(result.measurementBasisSummary).toBe('1234.5600 CNY @ 2023-05-10');
        });

        it('returns procurement detail with source summary', async () => {
            projectActualCostRecordRepository.findById.mockResolvedValue(
                {
                    id: RECORD_ID,
                    projectId: PROJECT_ID,
                    recordNo: 'PROCUREMENT-1',
                    costType: 'PROCUREMENT',
                    costSubtype: 'hardware',
                    occurredOn: '2023-06-15',
                    accountingPeriod: null,
                    registeredAt: new Date('2023-06-01T10:00:00.000Z'),
                    confirmedAt: null,
                    includedAt: null,
                    executionStageCode: null,
                    stageDerivedFromType: null,
                    stageDerivedFromId: null,
                    stageDerivedAt: null,
                    stageLockedAt: null,
                    currency: 'CNY',
                    amountExcludingTax: '4567.8900',
                    taxCostAmount: null,
                    amountIncludingTax: null,
                    recordStatus: 'REGISTERED',
                    isIncludedInProjectCost: false,
                    isHighRisk: false,
                    sourceType: 'PAYABLE_RECORD',
                    sourceId: PAYABLE_RECORD_ID,
                    sourceRefNo: PAYABLE_RECORD_ID,
                    evidenceSummary: 'quotation archived',
                    attachmentCount: 1,
                    registeredBy: USER_ID,
                    confirmedBy: null,
                    includedBy: null,
                    ownerRole: null,
                    costDescription: 'mapped from approved commitment',
                    taxImpactSummary: 'tax impact pending invoice',
                    riskNote: 'PROCUREMENT mapping expresses commitment boundary only; default not included until downstream inclusion rules say so',
                    supersedesRecordId: null,
                    voidReason: null,
                    laborPersonId: null,
                    laborRole: null,
                    laborPeriodType: null,
                    laborPeriodStart: null,
                    laborPeriodEnd: null,
                    actualHours: null,
                    actualPersonDays: null,
                    internalCostRate: null,
                    laborAmount: null,
                    workSummary: null,
                    deliveryStage: null,
                    rateVersionId: null,
                    rowVersion: 1,
                    createdAt: new Date('2023-06-01T10:00:00.000Z'),
                    updatedAt: new Date('2023-06-01T10:00:00.000Z')
                } as never
            );
            contractFinanceRepository.findPayableById.mockResolvedValue(
                makePayableRecord({ status: 'partially-paid' }) as never
            );
            projectActualCostRecordRepository.findReplacementBySupersedesRecordId.mockResolvedValue(null);

            const result = await service.getProjectActualCostRecordDetail(RECORD_ID);

            expect(result.allowedActions).toEqual([]);
            expect(result.sourceStatusSummary).toBe('PayableRecord:partially-paid');
            expect(result.effectivePeriodSummary).toBe('2023-06-15');
            expect(result.measurementBasisSummary).toBe('4567.8900 CNY ex-tax @ 2023-06-15');
        });
    });

    describe('registerLaborCostRecord', () => {
        it('registers a labor cost record with calculated amount and traceable rate version', async () => {
            internalCostRateVersionRepository.findById.mockResolvedValue(makeRateVersion() as never);

            const result = await service.registerLaborCostRecord(
                {
                    projectId: PROJECT_ID,
                    laborRole: 'dev',
                    laborPeriodType: 'MONTH',
                    laborPeriodStart: '2023-01-01',
                    laborPeriodEnd: '2023-01-31',
                    rateVersionId: RATE_VERSION_ID,
                    actualPersonDays: '20'
                },
                USER_ID
            );

            expect(projectActualCostRecordRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    costType: 'LABOR',
                    currency: 'CNY',
                    amountExcludingTax: '20000.0000',
                    amountIncludingTax: '20000.0000',
                    internalCostRate: '1000.0000',
                    laborAmount: '20000.0000',
                    rateVersionId: RATE_VERSION_ID,
                    sourceId: RATE_VERSION_ID,
                    sourceRefNo: 'ROLE:dev:DAY'
                })
            );
            expect(projectActualCostRecordRepository.save).toHaveBeenCalled();
            expect(result.resultStatus).toBe('success');
            expect(result.targetId).toBe(RECORD_ID);
        });

        it('throws NotFoundException if the rate version is missing', async () => {
            internalCostRateVersionRepository.findById.mockResolvedValue(null);

            await expect(
                service.registerLaborCostRecord(
                    {
                        projectId: PROJECT_ID,
                        laborPeriodType: 'MONTH',
                        laborPeriodStart: '2023-01-01',
                        laborPeriodEnd: '2023-01-31',
                        rateVersionId: RATE_VERSION_ID,
                        actualPersonDays: '20'
                    },
                    USER_ID
                )
            ).rejects.toThrow(NotFoundException);
        });

        it('blocks labor records that cross the selected rate version period', async () => {
            internalCostRateVersionRepository.findById.mockResolvedValue(
                makeRateVersion({ effectiveTo: new Date('2023-01-15T00:00:00.000Z') }) as never
            );

            await expect(
                service.registerLaborCostRecord(
                    {
                        projectId: PROJECT_ID,
                        laborRole: 'dev',
                        laborPeriodType: 'MONTH',
                        laborPeriodStart: '2023-01-01',
                        laborPeriodEnd: '2023-01-31',
                        rateVersionId: RATE_VERSION_ID,
                        actualPersonDays: '20'
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('replaceLaborCostRecord', () => {
        it('throws NotFoundException if original record is not found', async () => {
            projectActualCostRecordRepository.findById.mockResolvedValue(null);

            await expect(
                service.replaceLaborCostRecord(
                    {
                        supersedesRecordId: RECORD_ID,
                        laborPeriodStart: '2023-01-01',
                        laborPeriodEnd: '2023-01-31',
                        rateVersionId: RATE_VERSION_ID,
                        actualPersonDays: '20',
                        replaceReason: 'Correction'
                    },
                    USER_ID
                )
            ).rejects.toThrow(NotFoundException);
        });

        it('throws ConflictException if optimistic locking fails', async () => {
            projectActualCostRecordRepository.findById.mockResolvedValue({ id: RECORD_ID, rowVersion: 1 } as never);

            await expect(
                service.replaceLaborCostRecord(
                    {
                        supersedesRecordId: RECORD_ID,
                        laborPeriodStart: '2023-01-01',
                        laborPeriodEnd: '2023-01-31',
                        rateVersionId: RATE_VERSION_ID,
                        actualPersonDays: '20',
                        replaceReason: 'Correction',
                        expectedVersion: 2
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });

        it('successfully replaces a labor cost record using append-only supersedes chain', async () => {
            const originalRecord = {
                id: RECORD_ID,
                projectId: PROJECT_ID,
                costType: 'LABOR',
                recordStatus: 'REGISTERED',
                isIncludedInProjectCost: false,
                rowVersion: 1,
                laborRole: 'dev',
                laborPeriodType: 'MONTH',
                costSubtype: null
            };

            projectActualCostRecordRepository.findById.mockResolvedValue(originalRecord as never);
            internalCostRateVersionRepository.findById.mockResolvedValue(makeRateVersion() as never);

            const result = await service.replaceLaborCostRecord(
                {
                    supersedesRecordId: RECORD_ID,
                    laborPeriodStart: '2023-01-01',
                    laborPeriodEnd: '2023-01-31',
                    rateVersionId: RATE_VERSION_ID,
                    actualPersonDays: '22.5',
                    replaceReason: 'Corrected working days'
                },
                USER_ID
            );

            expect(originalRecord.recordStatus).toBe('REPLACED');
            expect(projectActualCostRecordRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    supersedesRecordId: RECORD_ID,
                    amountExcludingTax: '22500.0000',
                    amountIncludingTax: '22500.0000',
                    laborAmount: '22500.0000',
                    rateVersionId: RATE_VERSION_ID
                })
            );
            expect(projectActualCostRecordRepository.saveAll).toHaveBeenCalled();
            expect(result.resultStatus).toBe('success');
            expect(result.targetId).toBe(RECORD_ID);
        });
    });
});
