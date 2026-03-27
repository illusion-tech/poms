import { EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { Contract } from '../contract/contract.entity';
import { Project } from '../project/project.entity';
import { PaymentRecord } from './payment-record.entity';
import { ReceiptRecord } from './receipt-record.entity';

@Injectable()
export class ContractFinanceRepository {
    constructor(
        @InjectRepository(Project)
        private readonly projectRepository: EntityRepository<Project>,
        @InjectRepository(Contract)
        private readonly contractRepository: EntityRepository<Contract>,
        @InjectRepository(ReceiptRecord)
        private readonly receiptRepository: EntityRepository<ReceiptRecord>,
        @InjectRepository(PaymentRecord)
        private readonly paymentRepository: EntityRepository<PaymentRecord>
    ) {}

    async findProjectById(id: string): Promise<Project | null> {
        return this.projectRepository.findOne({ id });
    }

    async findContractById(id: string): Promise<Contract | null> {
        return this.contractRepository.findOne({ id });
    }

    async findReceiptsForContract(contractId: string): Promise<ReceiptRecord[]> {
        return this.receiptRepository.find({ contractId }, { orderBy: { receiptDate: QueryOrder.DESC, createdAt: QueryOrder.DESC } });
    }

    async findReceiptById(id: string): Promise<ReceiptRecord | null> {
        return this.receiptRepository.findOne({ id });
    }

    createReceipt(input: ConstructorParameters<typeof ReceiptRecord>[0]): ReceiptRecord {
        return this.receiptRepository.create(input);
    }

    async persistAndFlushReceipt(entity: ReceiptRecord): Promise<void> {
        const em = this.receiptRepository.getEntityManager();
        em.persist(entity);
        await em.flush();
    }

    async flushReceipt(): Promise<void> {
        await this.receiptRepository.getEntityManager().flush();
    }

    async findPaymentsForProject(projectId: string): Promise<PaymentRecord[]> {
        return this.paymentRepository.find({ projectId }, { orderBy: { paymentDate: QueryOrder.DESC, createdAt: QueryOrder.DESC } });
    }

    async findPaymentById(id: string): Promise<PaymentRecord | null> {
        return this.paymentRepository.findOne({ id });
    }

    createPayment(input: ConstructorParameters<typeof PaymentRecord>[0]): PaymentRecord {
        return this.paymentRepository.create(input);
    }

    async persistAndFlushPayment(entity: PaymentRecord): Promise<void> {
        const em = this.paymentRepository.getEntityManager();
        em.persist(entity);
        await em.flush();
    }

    async flushPayment(): Promise<void> {
        await this.paymentRepository.getEntityManager().flush();
    }

    async findConfirmedReceiptsForProject(projectId: string): Promise<ReceiptRecord[]> {
        return this.receiptRepository.find({ projectId, status: 'confirmed' });
    }

    async findConfirmedPaymentsForProject(projectId: string): Promise<PaymentRecord[]> {
        return this.paymentRepository.find({ projectId, status: 'confirmed' });
    }
}
