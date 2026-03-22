import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';

describe('ContractController', () => {
    const contractId = '30000000-0000-0000-0000-000000000001';
    const projectId = '20000000-0000-0000-0000-000000000001';
    const userId = '00000000-0000-0000-0000-000000000001';
    const baseDate = new Date('2026-03-22T10:00:00.000Z');

    let controller: ContractController;
    let contractService: jest.Mocked<ContractService>;

    beforeEach(() => {
        contractService = {
            findMany: jest.fn(),
            findByNo: jest.fn(),
            findById: jest.fn(),
            createAndSave: jest.fn(),
            updateBasicInfo: jest.fn()
        } as unknown as jest.Mocked<ContractService>;

        controller = new ContractController(contractService);
    });

    it('maps create payload signedAt into Date', async () => {
        const signedAt = '2026-03-20T09:30:00.000Z';
        contractService.createAndSave.mockResolvedValue(
            createContractEntity({
                signedAt: new Date(signedAt)
            })
        );

        await controller.create({
            projectId,
            contractNo: 'HT-2026-001',
            signedAmount: '880000.00',
            signedAt,
            createdBy: userId,
            updatedBy: userId
        });

        expect(contractService.createAndSave).toHaveBeenCalledWith(
            expect.objectContaining({
                signedAt: new Date(signedAt)
            })
        );
    });

    it('maps update payload null signedAt into null', async () => {
        contractService.updateBasicInfo.mockResolvedValue(
            createContractEntity({
                signedAt: null
            })
        );

        await controller.updateBasicInfo(contractId, {
            signedAt: null,
            updatedBy: userId
        });

        expect(contractService.updateBasicInfo).toHaveBeenCalledWith(
            contractId,
            expect.objectContaining({
                signedAt: null,
                updatedBy: userId
            })
        );
    });

    it('leaves update payload signedAt undefined when not provided', async () => {
        contractService.updateBasicInfo.mockResolvedValue(createContractEntity());

        await controller.updateBasicInfo(contractId, {
            updatedBy: userId
        });

        expect(contractService.updateBasicInfo).toHaveBeenCalledWith(
            contractId,
            expect.objectContaining({
                signedAt: undefined,
                updatedBy: userId
            })
        );
    });

    function createContractEntity(overrides: Record<string, unknown> = {}) {
        return {
            id: contractId,
            projectId,
            contractNo: 'HT-2026-001',
            status: 'draft',
            signedAmount: '880000.00',
            currencyCode: 'CNY',
            currentSnapshotId: null,
            signedAt: null,
            rowVersion: 1,
            createdAt: baseDate,
            createdBy: userId,
            updatedAt: baseDate,
            updatedBy: userId,
            ...overrides
        };
    }
});
