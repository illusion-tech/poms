import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type {
    ConfirmPaymentRecordRequest,
    ConfirmReceiptRecordRequest,
    CreatePaymentRecordRequest,
    CreateReceiptRecordRequest,
    PaymentRecordSummary,
    ReceiptRecordSummary
} from '@poms/shared-contracts';
import { ContractFinanceRepository } from './contract-finance.repository';
import type { PaymentRecord } from './payment-record.entity';
import type { ReceiptRecord } from './receipt-record.entity';

@Injectable()
export class ContractFinanceService {
    constructor(private readonly repo: ContractFinanceRepository) {}

    async listReceipts(contractId: string): Promise<ReceiptRecordSummary[]> {
        const receipts = await this.repo.findReceiptsForContract(contractId);
        return receipts.map(this.#toReceiptSummary);
    }

    async createReceipt(
        contractId: string,
        dto: CreateReceiptRecordRequest
    ): Promise<ReceiptRecordSummary> {
        const contract = await this.repo.findContractById(contractId);
        if (!contract) {
            throw new NotFoundException(`Contract ${contractId} not found`);
        }
        if (contract.status !== 'active') {
            throw new UnprocessableEntityException(`只有已生效合同可以登记回款，当前状态: ${contract.status}`);
        }

        const entity = this.repo.createReceipt({
            contractId: contract.id,
            projectId: contract.projectId,
            receiptAmount: dto.receiptAmount,
            receiptDate: new Date(dto.receiptDate),
            sourceType: dto.sourceType ?? 'manual',
            status: 'pending-confirmation',
            confirmedAt: null,
            confirmedBy: null
        });
        await this.repo.persistAndFlushReceipt(entity);
        return this.#toReceiptSummary(entity);
    }

    async confirmReceipt(
        contractId: string,
        id: string,
        actorUserId: string,
        dto: ConfirmReceiptRecordRequest
    ): Promise<ReceiptRecordSummary> {
        const receipt = await this.repo.findReceiptById(id);
        if (!receipt || receipt.contractId !== contractId) {
            throw new NotFoundException(`ReceiptRecord ${id} not found for contract ${contractId}`);
        }
        this.#assertExpectedVersion(receipt.rowVersion, dto.expectedVersion, 'ReceiptRecord');

        if (receipt.status !== 'pending-confirmation') {
            throw new UnprocessableEntityException(`只有待确认状态的回款记录可以确认，当前状态: ${receipt.status}`);
        }

        receipt.status = 'confirmed';
        receipt.confirmedAt = new Date();
        receipt.confirmedBy = actorUserId;
        await this.repo.flushReceipt();
        return this.#toReceiptSummary(receipt);
    }

    async listPayments(projectId: string): Promise<PaymentRecordSummary[]> {
        const payments = await this.repo.findPaymentsForProject(projectId);
        return payments.map(this.#toPaymentSummary);
    }

    async createPayment(
        projectId: string,
        dto: CreatePaymentRecordRequest
    ): Promise<PaymentRecordSummary> {
        const project = await this.repo.findProjectById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        if (dto.contractId) {
            const contract = await this.repo.findContractById(dto.contractId);
            if (!contract || contract.projectId !== projectId) {
                throw new NotFoundException(`Contract ${dto.contractId} not found for project ${projectId}`);
            }
        }

        const entity = this.repo.createPayment({
            projectId,
            contractId: dto.contractId ?? null,
            paymentAmount: dto.paymentAmount,
            paymentDate: new Date(dto.paymentDate),
            costCategory: dto.costCategory.trim(),
            sourceType: dto.sourceType ?? 'manual',
            status: 'recorded',
            confirmedAt: null,
            confirmedBy: null
        });
        await this.repo.persistAndFlushPayment(entity);
        return this.#toPaymentSummary(entity);
    }

    async confirmPayment(
        projectId: string,
        id: string,
        actorUserId: string,
        dto: ConfirmPaymentRecordRequest
    ): Promise<PaymentRecordSummary> {
        const payment = await this.repo.findPaymentById(id);
        if (!payment || payment.projectId !== projectId) {
            throw new NotFoundException(`PaymentRecord ${id} not found for project ${projectId}`);
        }
        this.#assertExpectedVersion(payment.rowVersion, dto.expectedVersion, 'PaymentRecord');

        if (payment.status !== 'recorded') {
            throw new UnprocessableEntityException(`只有已登记状态的付款记录可以确认生效，当前状态: ${payment.status}`);
        }

        payment.status = 'confirmed';
        payment.confirmedAt = new Date();
        payment.confirmedBy = actorUserId;
        await this.repo.flushPayment();
        return this.#toPaymentSummary(payment);
    }

    #assertExpectedVersion(actualVersion: number, expectedVersion: number | undefined, resourceType: string): void {
        if (expectedVersion !== undefined && actualVersion !== expectedVersion) {
            throw new ConflictException(`${resourceType} version ${expectedVersion} does not match current version ${actualVersion}`);
        }
    }

    readonly #toReceiptSummary = (entity: ReceiptRecord): ReceiptRecordSummary => ({
        id: entity.id,
        contractId: entity.contractId,
        projectId: entity.projectId,
        receiptAmount: typeof entity.receiptAmount === 'string' ? entity.receiptAmount : String(entity.receiptAmount),
        receiptDate: entity.receiptDate.toISOString(),
        sourceType: entity.sourceType,
        status: entity.status,
        confirmedAt: entity.confirmedAt?.toISOString() ?? null,
        confirmedBy: entity.confirmedBy ?? null,
        rowVersion: entity.rowVersion,
        createdAt: entity.createdAt.toISOString(),
        updatedAt: entity.updatedAt.toISOString()
    });

    readonly #toPaymentSummary = (entity: PaymentRecord): PaymentRecordSummary => ({
        id: entity.id,
        projectId: entity.projectId,
        contractId: entity.contractId ?? null,
        paymentAmount: typeof entity.paymentAmount === 'string' ? entity.paymentAmount : String(entity.paymentAmount),
        paymentDate: entity.paymentDate.toISOString(),
        costCategory: entity.costCategory,
        sourceType: entity.sourceType,
        status: entity.status,
        confirmedAt: entity.confirmedAt?.toISOString() ?? null,
        confirmedBy: entity.confirmedBy ?? null,
        rowVersion: entity.rowVersion,
        createdAt: entity.createdAt.toISOString(),
        updatedAt: entity.updatedAt.toISOString()
    });
}
