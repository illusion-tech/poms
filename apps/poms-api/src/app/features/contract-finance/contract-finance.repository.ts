import { EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import {
    PaymentRecordStatusValue,
    ProjectActualCostRecordStatusValue,
    ReceiptRecordStatusValue,
    type ProjectActualCostRecordStatus,
    type ProjectActualCostSourceType
} from '@poms/shared-contracts';
import { Contract } from '../contract/contract.entity';
import { Project } from '../project/project.entity';
import { ProjectActualCostRecord } from '../project-cost/project-actual-cost-record.entity';
import { InvoiceRecord } from './invoice-record.entity';
import { PayableRecord } from './payable-record.entity';
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
        @InjectRepository(InvoiceRecord)
        private readonly invoiceRepository: EntityRepository<InvoiceRecord>,
        @InjectRepository(PayableRecord)
        private readonly payableRepository: EntityRepository<PayableRecord>,
        @InjectRepository(PaymentRecord)
        private readonly paymentRepository: EntityRepository<PaymentRecord>,
        @InjectRepository(ProjectActualCostRecord)
        private readonly projectActualCostRecordRepository: EntityRepository<ProjectActualCostRecord>
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

    async findPayablesForProject(projectId: string): Promise<PayableRecord[]> {
        return this.payableRepository.find({ projectId }, { orderBy: { expectedPaymentDate: QueryOrder.DESC, createdAt: QueryOrder.DESC } });
    }

    async findPayableById(id: string): Promise<PayableRecord | null> {
        return this.payableRepository.findOne({ id });
    }

    createPayable(input: ConstructorParameters<typeof PayableRecord>[0]): PayableRecord {
        return this.payableRepository.create(input);
    }

    async persistAndFlushPayable(entity: PayableRecord): Promise<void> {
        const em = this.payableRepository.getEntityManager();
        em.persist(entity);
        await em.flush();
    }

    async flushPayable(): Promise<void> {
        await this.payableRepository.getEntityManager().flush();
    }

    async findPaymentsForProject(projectId: string): Promise<PaymentRecord[]> {
        return this.paymentRepository.find({ projectId }, { orderBy: { paymentDate: QueryOrder.DESC, createdAt: QueryOrder.DESC } });
    }

    async findPaymentsForPayable(payableRecordId: string): Promise<PaymentRecord[]> {
        return this.paymentRepository.find({ payableRecordId }, { orderBy: { paymentDate: QueryOrder.DESC, createdAt: QueryOrder.DESC } });
    }

    async findConfirmedPaymentsForPayableIds(payableRecordIds: string[]): Promise<PaymentRecord[]> {
        if (payableRecordIds.length === 0) {
            return [];
        }
        return this.paymentRepository.find({
            payableRecordId: { $in: payableRecordIds },
            status: PaymentRecordStatusValue.Confirmed
        });
    }

    async findInvoicesForProject(projectId: string): Promise<InvoiceRecord[]> {
        return this.invoiceRepository.find({ projectId }, { orderBy: { invoiceDate: QueryOrder.DESC, createdAt: QueryOrder.DESC } });
    }

    async findInvoiceById(id: string): Promise<InvoiceRecord | null> {
        return this.invoiceRepository.findOne({ id });
    }

    createInvoice(input: ConstructorParameters<typeof InvoiceRecord>[0]): InvoiceRecord {
        return this.invoiceRepository.create(input);
    }

    async persistAndFlushInvoice(entity: InvoiceRecord): Promise<void> {
        const em = this.invoiceRepository.getEntityManager();
        em.persist(entity);
        await em.flush();
    }

    async flushInvoice(): Promise<void> {
        await this.invoiceRepository.getEntityManager().flush();
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
        return this.receiptRepository.find({ projectId, status: ReceiptRecordStatusValue.Confirmed });
    }

    async findConfirmedPaymentsForProject(projectId: string): Promise<PaymentRecord[]> {
        return this.paymentRepository.find({ projectId, status: PaymentRecordStatusValue.Confirmed });
    }

    async findCurrentCostMappingBySource(
        sourceType: ProjectActualCostSourceType,
        sourceId: string,
        activeStatuses: ProjectActualCostRecordStatus[] = [ProjectActualCostRecordStatusValue.Registered, ProjectActualCostRecordStatusValue.Confirmed, ProjectActualCostRecordStatusValue.Included]
    ): Promise<ProjectActualCostRecord | null> {
        return this.projectActualCostRecordRepository.findOne(
            {
                sourceType,
                sourceId,
                recordStatus: { $in: activeStatuses }
            },
            {
                orderBy: { createdAt: QueryOrder.DESC }
            }
        );
    }
}
