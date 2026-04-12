import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type {
    CloseInvoiceRecordRequest,
    ConfirmPaymentRecordRequest,
    ConfirmReceiptRecordRequest,
    CreateInvoiceRecordRequest,
    CreatePaymentRecordRequest,
    CreateReceiptRecordRequest,
    InvoiceRecordDetailView,
    InvoiceRecordSummary,
    MarkInvoiceExceptionRequest,
    PaymentRecordSummary,
    ReceiptRecordSummary,
    ResolveInvoiceExceptionRequest,
    UpdateInvoiceRecordRequest
} from '@poms/shared-contracts';
import { ContractFinanceRepository } from './contract-finance.repository';
import type { InvoiceRecord } from './invoice-record.entity';
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

    async listInvoices(projectId: string): Promise<InvoiceRecordSummary[]> {
        const invoices = await this.repo.findInvoicesForProject(projectId);
        return invoices.map(this.#toInvoiceSummary);
    }

    async getInvoice(id: string): Promise<InvoiceRecordDetailView> {
        const invoice = await this.repo.findInvoiceById(id);
        if (!invoice) {
            throw new NotFoundException(`InvoiceRecord ${id} not found`);
        }

        return {
            ...this.#toInvoiceSummary(invoice),
            allowedActions: this.#buildInvoiceAllowedActions(invoice)
        };
    }

    async createInvoice(
        projectId: string,
        dto: CreateInvoiceRecordRequest
    ): Promise<InvoiceRecordSummary> {
        const project = await this.repo.findProjectById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        const contractId = dto.contractId ?? null;
        await this.#assertInvoiceContractScope(projectId, contractId, dto.invoiceType);

        const entity = this.repo.createInvoice({
            projectId,
            contractId,
            invoiceType: dto.invoiceType,
            invoiceNumber: dto.invoiceNumber.trim(),
            invoiceAmount: dto.invoiceAmount,
            invoiceDate: this.#toDateValue(dto.invoiceDate),
            status: 'draft',
            exceptionStatus: 'none',
            exceptionReason: null,
            exceptionResolution: null,
            closedAt: null,
            closeReason: null
        });
        await this.repo.persistAndFlushInvoice(entity);
        return this.#toInvoiceSummary(entity);
    }

    async updateInvoice(
        id: string,
        dto: UpdateInvoiceRecordRequest
    ): Promise<InvoiceRecordSummary> {
        const invoice = await this.repo.findInvoiceById(id);
        if (!invoice) {
            throw new NotFoundException(`InvoiceRecord ${id} not found`);
        }
        this.#assertExpectedVersion(invoice.rowVersion, dto.expectedVersion, 'InvoiceRecord');

        if (invoice.status === 'closed') {
            throw new UnprocessableEntityException('已关闭发票记录不允许再更新');
        }
        if (invoice.status === 'exception' && invoice.exceptionStatus === 'open') {
            throw new UnprocessableEntityException('异常处理中发票记录不允许直接更新，请先解决异常');
        }

        if (dto.contractId !== undefined) {
            await this.#assertInvoiceContractScope(invoice.projectId, dto.contractId, invoice.invoiceType);
            invoice.contractId = dto.contractId;
        }

        if (dto.invoiceNumber !== undefined) {
            invoice.invoiceNumber = dto.invoiceNumber.trim();
        }
        if (dto.invoiceAmount !== undefined) {
            invoice.invoiceAmount = dto.invoiceAmount;
        }
        if (dto.invoiceDate !== undefined) {
            invoice.invoiceDate = this.#toDateValue(dto.invoiceDate);
        }
        if (dto.status !== undefined) {
            invoice.status = dto.status;
        }

        await this.repo.flushInvoice();
        return this.#toInvoiceSummary(invoice);
    }

    async markInvoiceException(
        id: string,
        dto: MarkInvoiceExceptionRequest
    ): Promise<InvoiceRecordSummary> {
        const invoice = await this.repo.findInvoiceById(id);
        if (!invoice) {
            throw new NotFoundException(`InvoiceRecord ${id} not found`);
        }
        this.#assertExpectedVersion(invoice.rowVersion, dto.expectedVersion, 'InvoiceRecord');

        if (invoice.status === 'closed') {
            throw new UnprocessableEntityException('已关闭发票记录不允许标记异常');
        }
        if (invoice.exceptionStatus === 'open') {
            throw new UnprocessableEntityException('当前发票记录已处于异常处理中');
        }

        invoice.status = 'exception';
        invoice.exceptionStatus = 'open';
        invoice.exceptionReason = this.#appendComment(dto.reason.trim(), dto.comment);
        invoice.exceptionResolution = null;

        await this.repo.flushInvoice();
        return this.#toInvoiceSummary(invoice);
    }

    async resolveInvoiceException(
        id: string,
        dto: ResolveInvoiceExceptionRequest
    ): Promise<InvoiceRecordSummary> {
        const invoice = await this.repo.findInvoiceById(id);
        if (!invoice) {
            throw new NotFoundException(`InvoiceRecord ${id} not found`);
        }
        this.#assertExpectedVersion(invoice.rowVersion, dto.expectedVersion, 'InvoiceRecord');

        if (invoice.status !== 'exception' || invoice.exceptionStatus !== 'open') {
            throw new UnprocessableEntityException('只有异常处理中发票记录可以执行异常解决');
        }

        invoice.exceptionStatus = 'resolved';
        invoice.exceptionResolution = this.#appendComment(dto.resolution.trim(), dto.comment);

        await this.repo.flushInvoice();
        return this.#toInvoiceSummary(invoice);
    }

    async closeInvoiceRecord(
        id: string,
        dto: CloseInvoiceRecordRequest
    ): Promise<InvoiceRecordSummary> {
        const invoice = await this.repo.findInvoiceById(id);
        if (!invoice) {
            throw new NotFoundException(`InvoiceRecord ${id} not found`);
        }
        this.#assertExpectedVersion(invoice.rowVersion, dto.expectedVersion, 'InvoiceRecord');

        if (invoice.status === 'closed') {
            throw new UnprocessableEntityException('当前发票记录已经关闭');
        }
        if (invoice.status === 'exception' && invoice.exceptionStatus === 'open') {
            throw new UnprocessableEntityException('异常处理中发票记录不允许关闭，请先解决异常');
        }

        invoice.status = 'closed';
        invoice.closedAt = new Date();
        invoice.closeReason = this.#appendComment(dto.reason.trim(), dto.comment);

        await this.repo.flushInvoice();
        return this.#toInvoiceSummary(invoice);
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

    async #assertInvoiceContractScope(
        projectId: string,
        contractId: string | null,
        invoiceType: 'input' | 'output'
    ): Promise<void> {
        if (!contractId) {
            if (invoiceType === 'output') {
                throw new UnprocessableEntityException('销项发票必须关联已生效合同');
            }
            return;
        }

        const contract = await this.repo.findContractById(contractId);
        if (!contract || contract.projectId !== projectId) {
            throw new NotFoundException(`Contract ${contractId} not found for project ${projectId}`);
        }
        if (contract.status !== 'active') {
            throw new UnprocessableEntityException(`只有已生效合同可以关联发票记录，当前状态: ${contract.status}`);
        }
    }

    #buildInvoiceAllowedActions(invoice: InvoiceRecord): string[] {
        if (invoice.status === 'closed') {
            return [];
        }
        if (invoice.status === 'exception' && invoice.exceptionStatus === 'open') {
            return ['resolve-exception'];
        }
        if (invoice.status === 'exception' && invoice.exceptionStatus === 'resolved') {
            return ['close'];
        }
        return ['update', 'mark-exception', 'close'];
    }

    #toDateValue(value: string): string {
        return value.slice(0, 10);
    }

    #toDateOnly(value: Date | string): string {
        if (typeof value === 'string') {
            return value.slice(0, 10);
        }
        return value.toISOString().slice(0, 10);
    }

    #appendComment(value: string, comment?: string | null): string {
        const normalizedComment = comment?.trim();
        return normalizedComment ? `${value}\n${normalizedComment}` : value;
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

    readonly #toInvoiceSummary = (entity: InvoiceRecord): InvoiceRecordSummary => ({
        id: entity.id,
        projectId: entity.projectId,
        contractId: entity.contractId ?? null,
        invoiceType: entity.invoiceType,
        invoiceNumber: entity.invoiceNumber,
        invoiceAmount: typeof entity.invoiceAmount === 'string' ? entity.invoiceAmount : String(entity.invoiceAmount),
        invoiceDate: this.#toDateOnly(entity.invoiceDate),
        status: entity.status,
        exceptionStatus: entity.exceptionStatus,
        exceptionReason: entity.exceptionReason ?? null,
        exceptionResolution: entity.exceptionResolution ?? null,
        closedAt: entity.closedAt?.toISOString() ?? null,
        closeReason: entity.closeReason ?? null,
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
