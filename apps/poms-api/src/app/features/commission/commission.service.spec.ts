jest.mock('@mikro-orm/core', () => {
    const makeChain = () => {
        const chain: Record<string, unknown> = {};
        ['primary', 'nullable', 'length', 'defaultRaw', 'unique', 'fieldName', 'version', 'default', 'onCreate', 'onUpdate'].forEach((m) => {
            chain[m] = () => chain;
        });
        return chain;
    };
    const defineEntity = (_config: unknown) => ({ class: class {}, setClass: () => {} });
    defineEntity.properties = new Proxy({} as Record<string, unknown>, { get: () => makeChain });
    return { QueryOrder: { ASC: 'ASC', DESC: 'DESC' }, defineEntity };
});

import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CommissionService } from './commission.service';
import type { CommissionRepository } from './commission.repository';

const RULE_VERSION_ID = '50000000-0000-4000-8000-000000000001';
const ASSIGNMENT_ID = '51000000-0000-4000-8000-000000000001';
const CALCULATION_ID = '52000000-0000-4000-8000-000000000001';
const PAYOUT_ID = '53000000-0000-4000-8000-000000000001';
const PROJECT_ID = '00000000-0000-4000-8000-000000000001';

const makeDraftRule = (overrides: Record<string, unknown> = {}) => ({
    id: RULE_VERSION_ID,
    ruleCode: 'STANDARD',
    version: 1,
    status: 'draft',
    tierDefinitionJson: { tiers: [{ minMarginRate: 0.2, maxMarginRate: null, commissionRate: 0.08 }] },
    firstStageCapRuleJson: null,
    secondStageCapRuleJson: null,
    retentionRuleJson: null,
    lowDownPaymentRuleJson: null,
    exceptionRuleJson: null,
    effectiveFrom: null,
    createdAt: new Date('2026-03-25T10:00:00Z'),
    updatedAt: new Date('2026-03-25T10:00:00Z'),
    ...overrides
});

const makeDraftAssignment = (overrides: Record<string, unknown> = {}) => ({
    id: ASSIGNMENT_ID,
    projectId: PROJECT_ID,
    version: 1,
    isCurrent: true,
    status: 'draft',
    participantsJson: [{ userId: '00000000-0000-4000-8000-000000000010', displayName: '张三', roleType: 'PM', weight: 1.0 }],
    frozenAt: null,
    frozenBy: null,
    supersedesId: null,
    createdAt: new Date('2026-03-25T10:00:00Z'),
    updatedAt: new Date('2026-03-25T10:00:00Z'),
    ...overrides
});

const makeProject = () => ({
    id: PROJECT_ID
});

const makeCalculatedResult = (overrides: Record<string, unknown> = {}) => ({
    id: CALCULATION_ID,
    projectId: PROJECT_ID,
    ruleVersionId: RULE_VERSION_ID,
    version: 1,
    isCurrent: true,
    status: 'calculated',
    recognizedRevenueTaxExclusive: '100000.00',
    recognizedCostTaxExclusive: '70000.00',
    contributionMargin: '30000.00',
    contributionMarginRate: '0.3000',
    commissionPool: '2400.00',
    recalculatedFromId: null,
    approvedAt: null,
    rowVersion: 1,
    createdAt: new Date('2026-03-25T10:00:00Z'),
    updatedAt: new Date('2026-03-25T10:00:00Z'),
    ...overrides
});

const makeDraftPayout = (overrides: Record<string, unknown> = {}) => ({
    id: PAYOUT_ID,
    projectId: PROJECT_ID,
    calculationId: CALCULATION_ID,
    stageType: 'first',
    selectedTier: 'basic',
    theoreticalCapAmount: '480.00',
    approvedAmount: null,
    paidRecordAmount: null,
    status: 'draft',
    approvedAt: null,
    handledAt: null,
    rowVersion: 1,
    createdAt: new Date('2026-03-25T10:00:00Z'),
    updatedAt: new Date('2026-03-25T10:00:00Z'),
    ...overrides
});

describe('CommissionService', () => {
    let service: CommissionService;
    let repo: jest.Mocked<CommissionRepository>;

    beforeEach(() => {
        repo = {
            findProjectById: jest.fn(),
            findAllRuleVersions: jest.fn(),
            findRuleVersionById: jest.fn(),
            findRuleVersionByCodeAndVersion: jest.fn(),
            findActiveRuleVersion: jest.fn(),
            createRuleVersion: jest.fn(),
            persistAndFlushRuleVersion: jest.fn(),
            flushRuleVersion: jest.fn(),
            findCurrentRoleAssignment: jest.fn(),
            findRoleAssignmentById: jest.fn(),
            findAllRoleAssignmentsForProject: jest.fn(),
            createRoleAssignment: jest.fn(),
            persistAndFlushRoleAssignment: jest.fn(),
            flushRoleAssignment: jest.fn(),
            findCurrentCalculation: jest.fn(),
            findCalculationById: jest.fn(),
            findCalculationsForProject: jest.fn(),
            createCalculation: jest.fn(),
            persistAndFlushCalculation: jest.fn(),
            flushCalculation: jest.fn(),
            findPayoutById: jest.fn(),
            findPayoutsForProject: jest.fn(),
            findPayoutByProjectCalculationStage: jest.fn(),
            createPayout: jest.fn(),
            persistAndFlushPayout: jest.fn(),
            flushPayout: jest.fn()
        } as unknown as jest.Mocked<CommissionRepository>;

        service = new CommissionService(repo);
    });

    // ── Rule Versions ────────────────────────────────────────────────────────

    describe('listRuleVersions', () => {
        it('returns list from repository', async () => {
            repo.findAllRuleVersions.mockResolvedValue([makeDraftRule() as never]);
            const result = await service.listRuleVersions();
            expect(result).toHaveLength(1);
            expect(result[0].ruleCode).toBe('STANDARD');
        });
    });

    describe('createRuleVersion', () => {
        it('creates a draft rule version', async () => {
            repo.findRuleVersionByCodeAndVersion.mockResolvedValue(null);
            const created = makeDraftRule();
            repo.createRuleVersion.mockReturnValue(created as never);
            repo.persistAndFlushRuleVersion.mockResolvedValue();

            const result = await service.createRuleVersion({
                ruleCode: 'STANDARD',
                version: 1,
                tierDefinitionJson: { tiers: [{ minMarginRate: 0.2, maxMarginRate: null, commissionRate: 0.08 }] }
            });

            expect(repo.createRuleVersion).toHaveBeenCalled();
            expect(result.status).toBe('draft');
        });

        it('throws ConflictException if rule_code+version already exists', async () => {
            repo.findRuleVersionByCodeAndVersion.mockResolvedValue(makeDraftRule() as never);

            await expect(
                service.createRuleVersion({
                    ruleCode: 'STANDARD',
                    version: 1,
                    tierDefinitionJson: { tiers: [{ minMarginRate: 0.2, maxMarginRate: null, commissionRate: 0.08 }] }
                })
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('activateRuleVersion', () => {
        it('activates a draft rule version', async () => {
            const rule = makeDraftRule();
            repo.findRuleVersionById.mockResolvedValue(rule as never);
            repo.findActiveRuleVersion.mockResolvedValue(null);
            repo.flushRuleVersion.mockResolvedValue();

            const result = await service.activateRuleVersion(RULE_VERSION_ID);

            expect(rule.status).toBe('active');
            expect(result.status).toBe('active');
        });

        it('stops existing active version when activating new one', async () => {
            const existingActive = makeDraftRule({ id: '50000000-0000-4000-8000-000000000099', status: 'active' });
            const newDraft = makeDraftRule();
            repo.findRuleVersionById.mockResolvedValue(newDraft as never);
            repo.findActiveRuleVersion.mockResolvedValue(existingActive as never);
            repo.flushRuleVersion.mockResolvedValue();

            await service.activateRuleVersion(RULE_VERSION_ID);

            expect(existingActive.status).toBe('stopped');
            expect(newDraft.status).toBe('active');
        });

        it('throws NotFoundException if rule version not found', async () => {
            repo.findRuleVersionById.mockResolvedValue(null);
            await expect(service.activateRuleVersion('nonexistent')).rejects.toThrow(NotFoundException);
        });

        it('throws UnprocessableEntityException if not draft', async () => {
            repo.findRuleVersionById.mockResolvedValue(makeDraftRule({ status: 'active' }) as never);
            await expect(service.activateRuleVersion(RULE_VERSION_ID)).rejects.toThrow(UnprocessableEntityException);
        });
    });

    describe('stopRuleVersion', () => {
        it('stops an active rule version', async () => {
            const rule = makeDraftRule({ status: 'active' });
            repo.findRuleVersionById.mockResolvedValue(rule as never);
            repo.flushRuleVersion.mockResolvedValue();

            const result = await service.stopRuleVersion(RULE_VERSION_ID);

            expect(rule.status).toBe('stopped');
            expect(result.status).toBe('stopped');
        });

        it('throws UnprocessableEntityException if not active', async () => {
            repo.findRuleVersionById.mockResolvedValue(makeDraftRule() as never);
            await expect(service.stopRuleVersion(RULE_VERSION_ID)).rejects.toThrow(UnprocessableEntityException);
        });
    });

    // ── Role Assignments ─────────────────────────────────────────────────────

    describe('getCurrentRoleAssignment', () => {
        it('returns current assignment if exists', async () => {
            repo.findCurrentRoleAssignment.mockResolvedValue(makeDraftAssignment() as never);
            const result = await service.getCurrentRoleAssignment(PROJECT_ID);
            expect(result?.projectId).toBe(PROJECT_ID);
        });

        it('returns null if no current assignment', async () => {
            repo.findCurrentRoleAssignment.mockResolvedValue(null);
            const result = await service.getCurrentRoleAssignment(PROJECT_ID);
            expect(result).toBeNull();
        });
    });

    describe('createRoleAssignment', () => {
        it('creates first assignment at version 1', async () => {
            repo.findCurrentRoleAssignment.mockResolvedValue(null);
            const created = makeDraftAssignment();
            repo.createRoleAssignment.mockReturnValue(created as never);
            repo.persistAndFlushRoleAssignment.mockResolvedValue();

            const result = await service.createRoleAssignment(PROJECT_ID, {
                participants: [{ userId: '00000000-0000-4000-8000-000000000010', displayName: '张三', roleType: 'PM', weight: 1.0 }]
            });

            expect(repo.createRoleAssignment).toHaveBeenCalledWith(expect.objectContaining({ version: 1, isCurrent: true }));
            expect(result.version).toBe(1);
        });

        it('creates next version and marks previous as not current', async () => {
            const existing = makeDraftAssignment({ status: 'frozen', version: 1 });
            repo.findCurrentRoleAssignment.mockResolvedValue(existing as never);
            const created = makeDraftAssignment({ version: 2 });
            repo.createRoleAssignment.mockReturnValue(created as never);
            repo.persistAndFlushRoleAssignment.mockResolvedValue();

            await service.createRoleAssignment(PROJECT_ID, {
                participants: [{ userId: '00000000-0000-4000-8000-000000000010', displayName: '张三', roleType: 'PM', weight: 1.0 }]
            });

            expect(existing.isCurrent).toBe(false);
            expect(existing.status).toBe('superseded');
            expect(repo.createRoleAssignment).toHaveBeenCalledWith(expect.objectContaining({ version: 2 }));
        });
    });

    describe('freezeRoleAssignment', () => {
        it('freezes a draft assignment', async () => {
            const assignment = makeDraftAssignment();
            repo.findRoleAssignmentById.mockResolvedValue(assignment as never);
            repo.flushRoleAssignment.mockResolvedValue();

            const result = await service.freezeRoleAssignment(PROJECT_ID, ASSIGNMENT_ID);

            expect(assignment.status).toBe('frozen');
            expect(result.status).toBe('frozen');
        });

        it('throws NotFoundException if assignment not found', async () => {
            repo.findRoleAssignmentById.mockResolvedValue(null);
            await expect(service.freezeRoleAssignment(PROJECT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
        });

        it('throws NotFoundException if assignment belongs to different project', async () => {
            repo.findRoleAssignmentById.mockResolvedValue(makeDraftAssignment({ projectId: 'other-project' }) as never);
            await expect(service.freezeRoleAssignment(PROJECT_ID, ASSIGNMENT_ID)).rejects.toThrow(NotFoundException);
        });

        it('throws UnprocessableEntityException if not draft', async () => {
            repo.findRoleAssignmentById.mockResolvedValue(makeDraftAssignment({ status: 'frozen' }) as never);
            await expect(service.freezeRoleAssignment(PROJECT_ID, ASSIGNMENT_ID)).rejects.toThrow(UnprocessableEntityException);
        });

        it('throws UnprocessableEntityException if participants is empty', async () => {
            repo.findRoleAssignmentById.mockResolvedValue(makeDraftAssignment({ participantsJson: [] }) as never);
            await expect(service.freezeRoleAssignment(PROJECT_ID, ASSIGNMENT_ID)).rejects.toThrow(UnprocessableEntityException);
        });
    });

    // ── Calculations ────────────────────────────────────────────────────────

    describe('listCalculations', () => {
        it('returns calculation list from repository', async () => {
            repo.findCalculationsForProject.mockResolvedValue([makeCalculatedResult() as never]);
            const result = await service.listCalculations(PROJECT_ID);
            expect(result).toHaveLength(1);
            expect(result[0].commissionPool).toBe('2400.00');
        });
    });

    describe('triggerCalculation', () => {
        it('creates a new calculated commission result', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.findAllRuleVersions.mockResolvedValue([makeDraftRule({ status: 'active' }) as never]);
            repo.findCurrentRoleAssignment.mockResolvedValue(makeDraftAssignment({ status: 'frozen' }) as never);
            repo.findCurrentCalculation.mockResolvedValue(null);
            const created = makeCalculatedResult();
            repo.createCalculation.mockReturnValue(created as never);
            repo.persistAndFlushCalculation.mockResolvedValue();

            const result = await service.triggerCalculation(PROJECT_ID, {
                recognizedRevenueTaxExclusive: '100000.00',
                recognizedCostTaxExclusive: '70000.00'
            });

            expect(repo.createCalculation).toHaveBeenCalledWith(expect.objectContaining({ version: 1, status: 'calculated' }));
            expect(result.contributionMargin).toBe('30000.00');
            expect(result.commissionPool).toBe('2400.00');
        });

        it('throws if active rule version is missing', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.findAllRuleVersions.mockResolvedValue([]);
            repo.findCurrentRoleAssignment.mockResolvedValue(makeDraftAssignment({ status: 'frozen' }) as never);

            await expect(
                service.triggerCalculation(PROJECT_ID, {
                    recognizedRevenueTaxExclusive: '100000.00',
                    recognizedCostTaxExclusive: '70000.00'
                })
            ).rejects.toThrow(UnprocessableEntityException);
        });
    });

    describe('confirmCalculation', () => {
        it('marks calculated result as effective', async () => {
            const calculation = makeCalculatedResult();
            repo.findCalculationById.mockResolvedValue(calculation as never);
            repo.flushCalculation.mockResolvedValue();

            const result = await service.confirmCalculation(PROJECT_ID, CALCULATION_ID, {});

            expect(calculation.status).toBe('effective');
            expect(result.status).toBe('effective');
        });

        it('throws if calculation is not in calculated status', async () => {
            repo.findCalculationById.mockResolvedValue(makeCalculatedResult({ status: 'effective' }) as never);
            await expect(service.confirmCalculation(PROJECT_ID, CALCULATION_ID, {})).rejects.toThrow(UnprocessableEntityException);
        });
    });

    // ── Payouts ─────────────────────────────────────────────────────────────

    describe('listPayouts', () => {
        it('returns payout list from repository', async () => {
            repo.findPayoutsForProject.mockResolvedValue([makeDraftPayout() as never]);
            const result = await service.listPayouts(PROJECT_ID);
            expect(result).toHaveLength(1);
            expect(result[0].theoreticalCapAmount).toBe('480.00');
        });
    });

    describe('createPayout', () => {
        it('creates payout draft from effective calculation', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.findCalculationById.mockResolvedValue(makeCalculatedResult({ status: 'effective' }) as never);
            repo.findPayoutByProjectCalculationStage.mockResolvedValue(null);
            const created = makeDraftPayout();
            repo.createPayout.mockReturnValue(created as never);
            repo.persistAndFlushPayout.mockResolvedValue();

            const result = await service.createPayout(PROJECT_ID, {
                calculationId: CALCULATION_ID,
                stageType: 'first',
                selectedTier: 'basic'
            });

            expect(repo.createPayout).toHaveBeenCalledWith(expect.objectContaining({ stageType: 'first', selectedTier: 'basic' }));
            expect(result.status).toBe('draft');
        });

        it('throws if payout already exists for stage', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.findCalculationById.mockResolvedValue(makeCalculatedResult({ status: 'effective' }) as never);
            repo.findPayoutByProjectCalculationStage.mockResolvedValue(makeDraftPayout() as never);

            await expect(
                service.createPayout(PROJECT_ID, {
                    calculationId: CALCULATION_ID,
                    stageType: 'first',
                    selectedTier: 'basic'
                })
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('submitPayoutApproval', () => {
        it('moves payout from draft to pending-approval', async () => {
            const payout = makeDraftPayout();
            repo.findPayoutById.mockResolvedValue(payout as never);
            repo.flushPayout.mockResolvedValue();

            const result = await service.submitPayoutApproval(PROJECT_ID, PAYOUT_ID, {});

            expect(payout.status).toBe('pending-approval');
            expect(result.status).toBe('pending-approval');
        });
    });

    describe('approvePayout', () => {
        it('approves payout with default approved amount', async () => {
            const payout = makeDraftPayout({ status: 'pending-approval' });
            repo.findPayoutById.mockResolvedValue(payout as never);
            repo.flushPayout.mockResolvedValue();

            const result = await service.approvePayout(PROJECT_ID, PAYOUT_ID, {});

            expect(payout.status).toBe('approved');
            expect(result.approvedAmount).toBe('480.00');
        });

        it('throws if approved amount is above cap', async () => {
            repo.findPayoutById.mockResolvedValue(makeDraftPayout({ status: 'pending-approval' }) as never);
            await expect(service.approvePayout(PROJECT_ID, PAYOUT_ID, { approvedAmount: '999.00' })).rejects.toThrow(UnprocessableEntityException);
        });
    });

    describe('registerPayout', () => {
        it('registers payout as paid', async () => {
            const payout = makeDraftPayout({ status: 'approved', approvedAmount: '480.00' });
            repo.findPayoutById.mockResolvedValue(payout as never);
            repo.flushPayout.mockResolvedValue();

            const result = await service.registerPayout(PROJECT_ID, PAYOUT_ID, { paidRecordAmount: '400.00' });

            expect(payout.status).toBe('paid');
            expect(result.paidRecordAmount).toBe('400.00');
        });

        it('throws if paid amount exceeds approved amount', async () => {
            repo.findPayoutById.mockResolvedValue(makeDraftPayout({ status: 'approved', approvedAmount: '480.00' }) as never);
            await expect(service.registerPayout(PROJECT_ID, PAYOUT_ID, { paidRecordAmount: '500.00' })).rejects.toThrow(UnprocessableEntityException);
        });
    });
});
