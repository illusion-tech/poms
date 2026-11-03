jest.mock('@mikro-orm/nestjs', () => ({
    InjectRepository: () => () => undefined
}));

import { ContractAmendmentRepository } from './contract.repository';

describe('ContractAmendmentRepository', () => {
    const amendmentId = '90000000-0000-4000-8000-000000000001';
    const contractId = '30000000-0000-4000-8000-000000000001';

    let repository: ContractAmendmentRepository;
    let entityRepository: {
        findOne: jest.Mock;
        create: jest.Mock;
        getEntityManager: jest.Mock;
    };
    let entityManager: {
        persist: jest.Mock;
        flush: jest.Mock;
    };

    beforeEach(() => {
        entityManager = {
            persist: jest.fn().mockReturnThis(),
            flush: jest.fn().mockResolvedValue(undefined)
        };
        entityRepository = {
            findOne: jest.fn(),
            create: jest.fn((input) => input),
            getEntityManager: jest.fn(() => entityManager)
        };

        repository = new ContractAmendmentRepository(entityRepository as never);
    });

    it('finds the current effective amendment by id for rebaseline guard input', async () => {
        const amendment = makeAmendment();
        entityRepository.findOne.mockResolvedValue(amendment);

        const result = await repository.findEffectiveById(amendmentId);

        expect(entityRepository.findOne).toHaveBeenCalledWith({
            id: amendmentId,
            status: 'effective',
            isCurrent: true
        });
        expect(result).toBe(amendment);
    });

    it('finds the current effective amendment by contract id', async () => {
        const amendment = makeAmendment();
        entityRepository.findOne.mockResolvedValue(amendment);

        const result = await repository.findCurrentByContractId(contractId);

        expect(entityRepository.findOne).toHaveBeenCalledWith({
            contractId,
            status: 'effective',
            isCurrent: true
        });
        expect(result).toBe(amendment);
    });

    it('persists an amendment entity', async () => {
        const amendment = makeAmendment();

        await repository.save(amendment as never);

        expect(entityManager.persist).toHaveBeenCalledWith(amendment);
        expect(entityManager.flush).toHaveBeenCalled();
    });

    function makeAmendment() {
        return {
            id: amendmentId,
            contractId,
            version: 2,
            isCurrent: true,
            supersedesId: null,
            status: 'effective',
            rowVersion: 1
        };
    }
});
