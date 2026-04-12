import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type {
    ClosePayableRecordRequest,
    CloseInvoiceRecordRequest,
    CompletePayableRecordRequest,
    ConfirmPaymentRecordRequest,
    ConfirmReceiptRecordRequest,
    CreatePayableRecordRequest,
    CreateInvoiceRecordRequest,
    CreatePaymentRecordRequest,
    CreateReceiptRecordRequest,
    InvoiceRecordDetailView,
    InvoiceRecordSummary,
    MarkPayableRecordPartiallyPaidRequest,
    MarkInvoiceExceptionRequest,
    PayableRecordDetailView,
    PayableRecordSummary,
    PaymentRecordSummary,
    ReceiptRecordSummary,
    ResolveInvoiceExceptionRequest,
    UpdatePayableRecordRequest,
    UpdateInvoiceRecordRequest,
    VoidPayableRecordRequest
} from '@poms/shared-contracts';
import { ContractFinanceRepository } from './contract-finance.repository';
import type { InvoiceRecord } from './invoice-record.entity';
import type { PayableRecord } from './payable-record.entity';
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

    async listPayables(projectId: string): Promise<PayableRecordSummary[]> {
        const payables = await this.repo.findPayablesForProject(projectId);
        return payables.map(this.#toPayableSummary);
    }

    async getPayable(id: string): Promise<PayableRecordDetailView> {
        const payable = await this.repo.findPayableById(id);
        if (!payable) {
            throw new NotFoundException(`PayableRecord ${id} not found`);
        }
        const hasCurrentCostMapping = !!(await this.repo.findCurrentCostMappingBySource('PAYABLE_RECORD', id));

        return {
            ...this.#toPayableSummary(payable),
            allowedActions: this.#buildPayableAllowedActions(payable, hasCurrentCostMapping)
        };
    }

    async createPayable(
        projectId: string,
        dto: CreatePayableRecordRequest
    ): Promise<PayableRecordSummary> {
        const project = await this.repo.findProjectById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        const contractId = dto.contractId ?? null;
        await this.#assertPayableContractScope(projectId, contractId);

        const entity = this.repo.createPayable({
            projectId,
            contractId,
            vendorName: dto.vendorName.trim(),
            costCategory: dto.costCategory.trim(),
            payableDescription: dto.payableDescription.trim(),
            currency: dto.currency?.trim() ?? 'CNY',
            registeredAmount: dto.registeredAmount,
            paidAmount: '0',
            expectedPaymentDate: this.#toDateValue(dto.expectedPaymentDate),
            status: 'recorded',
            evidenceSummary: dto.evidenceSummary ?? null,
            attachmentCount: dto.attachmentCount ?? 0,
            closedAt: null,
            closeReason: null,
            voidedAt: null,
            voidReason: null
        });
        await this.repo.persistAndFlushPayable(entity);
        return this.#toPayableSummary(entity);
    }

    async updatePayable(
        id: string,
        dto: UpdatePayableRecordRequest
    ): Promise<PayableRecordSummary> {
        const payable = await this.repo.findPayableById(id);
        if (!payable) {
            throw new NotFoundException(`PayableRecord ${id} not found`);
        }
        this.#assertExpectedVersion(payable.rowVersion, dto.expectedVersion, 'PayableRecord');

        if (payable.status === 'completed' || payable.status === 'closed' || payable.status === 'voided') {
            throw new UnprocessableEntityException(`当前状态 ${payable.status} 的采购承诺记录不允许再更新`);
        }
        await this.#assertSourceFactNotMapped('PAYABLE_RECORD', payable.id, '更新采购承诺记录');

        if (dto.contractId !== undefined) {
            await this.#assertPayableContractScope(payable.projectId, dto.contractId);
            payable.contractId = dto.contractId;
        }
        if (dto.vendorName !== undefined) {
            payable.vendorName = dto.vendorName.trim();
        }
        if (dto.costCategory !== undefined) {
            payable.costCategory = dto.costCategory.trim();
        }
        if (dto.payableDescription !== undefined) {
            payable.payableDescription = dto.payableDescription.trim();
        }
        if (dto.currency !== undefined) {
            payable.currency = dto.currency.trim();
        }
        if (dto.registeredAmount !== undefined) {
            payable.registeredAmount = dto.registeredAmount;
        }
        if (dto.expectedPaymentDate !== undefined) {
            payable.expectedPaymentDate = this.#toDateValue(dto.expectedPaymentDate);
        }
        if (dto.evidenceSummary !== undefined) {
            payable.evidenceSummary = dto.evidenceSummary;
        }
        if (dto.attachmentCount !== undefined) {
            payable.attachmentCount = dto.attachmentCount;
        }

        this.#assertPaidAmountNotExceedRegisteredAmount(payable.paidAmount, payable.registeredAmount);
        await this.repo.flushPayable();
        return this.#toPayableSummary(payable);
    }

    async markPayablePartiallyPaid(
        id: string,
        dto: MarkPayableRecordPartiallyPaidRequest
    ): Promise<PayableRecordSummary> {
        const payable = await this.repo.findPayableById(id);
        if (!payable) {
            throw new NotFoundException(`PayableRecord ${id} not found`);
        }
        this.#assertExpectedVersion(payable.rowVersion, dto.expectedVersion, 'PayableRecord');

        if (payable.status !== 'recorded' && payable.status !== 'partially-paid') {
            throw new UnprocessableEntityException(`当前状态 ${payable.status} 的采购承诺记录不允许标记部分支付`);
        }
        if (Number(dto.paidAmount) <= 0) {
            throw new UnprocessableEntityException('部分支付金额必须大于 0');
        }
        if (Number(dto.paidAmount) >= Number(payable.registeredAmount)) {
            throw new UnprocessableEntityException('部分支付金额必须小于登记金额；全额请使用完成动作');
        }

        payable.paidAmount = dto.paidAmount;
        payable.status = 'partially-paid';
        await this.repo.flushPayable();
        return this.#toPayableSummary(payable);
    }

    async completePayable(
        id: string,
        dto: CompletePayableRecordRequest
    ): Promise<PayableRecordSummary> {
        const payable = await this.repo.findPayableById(id);
        if (!payable) {
            throw new NotFoundException(`PayableRecord ${id} not found`);
        }
        this.#assertExpectedVersion(payable.rowVersion, dto.expectedVersion, 'PayableRecord');

        if (payable.status !== 'recorded' && payable.status !== 'partially-paid') {
            throw new UnprocessableEntityException(`当前状态 ${payable.status} 的采购承诺记录不允许完成`);
        }

        payable.paidAmount = typeof payable.registeredAmount === 'string' ? payable.registeredAmount : String(payable.registeredAmount);
        payable.status = 'completed';
        await this.repo.flushPayable();
        return this.#toPayableSummary(payable);
    }

    async closePayable(
        id: string,
        dto: ClosePayableRecordRequest
    ): Promise<PayableRecordSummary> {
        const payable = await this.repo.findPayableById(id);
        if (!payable) {
            throw new NotFoundException(`PayableRecord ${id} not found`);
        }
        this.#assertExpectedVersion(payable.rowVersion, dto.expectedVersion, 'PayableRecord');

        if (payable.status === 'closed' || payable.status === 'voided') {
            throw new UnprocessableEntityException(`当前状态 ${payable.status} 的采购承诺记录不允许关闭`);
        }
        await this.#assertSourceFactNotMapped('PAYABLE_RECORD', payable.id, '关闭采购承诺记录');

        payable.status = 'closed';
        payable.closedAt = new Date();
        payable.closeReason = this.#appendComment(dto.reason.trim(), dto.comment);
        await this.repo.flushPayable();
        return this.#toPayableSummary(payable);
    }

    async voidPayable(
        id: string,
        dto: VoidPayableRecordRequest
    ): Promise<PayableRecordSummary> {
        const payable = await this.repo.findPayableById(id);
        if (!payable) {
            throw new NotFoundException(`PayableRecord ${id} not found`);
        }
        this.#assertExpectedVersion(payable.rowVersion, dto.expectedVersion, 'PayableRecord');

        if (payable.status === 'voided') {
            throw new UnprocessableEntityException('当前采购承诺记录已经作废');
        }
        if (Number(payable.paidAmount) > 0) {
            throw new UnprocessableEntityException('存在已登记支付金额的采购承诺记录不允许直接作废');
        }
        await this.#assertSourceFactNotMapped('PAYABLE_RECORD', payable.id, '作废采购承诺记录');

        payable.status = 'voided';
        payable.voidedAt = new Date();
        payable.voidReason = this.#appendComment(dto.reason.trim(), dto.comment);
        await this.repo.flushPayable();
        return this.#toPayableSummary(payable);
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
        const hasCurrentCostMapping = !!(await this.repo.findCurrentCostMappingBySource('INVOICE_RECORD', id));

        return {
            ...this.#toInvoiceSummary(invoice),
            allowedActions: this.#buildInvoiceAllowedActions(invoice, hasCurrentCostMapping)
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
        await this.#assertSourceFactNotMapped('INVOICE_RECORD', invoice.id, '更新发票记录');

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
        await this.#assertSourceFactNotMapped('INVOICE_RECORD', invoice.id, '标记发票异常');

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
        await this.#assertSourceFactNotMapped('INVOICE_RECORD', invoice.id, '解决发票异常');

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
        await this.#assertSourceFactNotMapped('INVOICE_RECORD', invoice.id, '关闭发票记录');

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

        const payable = dto.payableRecordId ? await this.repo.findPayableById(dto.payableRecordId) : null;
        if (dto.payableRecordId && (!payable || payable.projectId !== projectId)) {
            throw new NotFoundException(`PayableRecord ${dto.payableRecordId} not found for project ${projectId}`);
        }
        if (payable && payable.status !== 'recorded' && payable.status !== 'partially-paid') {
            throw new UnprocessableEntityException(`当前状态 ${payable.status} 的采购承诺记录不允许继续登记付款`);
        }

        const contractId = dto.contractId ?? payable?.contractId ?? null;
        if (contractId) {
            const contract = await this.repo.findContractById(contractId);
            if (!contract || contract.projectId !== projectId) {
                throw new NotFoundException(`Contract ${contractId} not found for project ${projectId}`);
            }
        }

        const entity = this.repo.createPayment({
            projectId,
            contractId,
            payableRecordId: payable?.id ?? null,
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

    async #assertPayableContractScope(projectId: string, contractId: string | null): Promise<void> {
        if (!contractId) {
            return;
        }

        const contract = await this.repo.findContractById(contractId);
        if (!contract || contract.projectId !== projectId) {
            throw new NotFoundException(`Contract ${contractId} not found for project ${projectId}`);
        }
        if (contract.status !== 'active') {
            throw new UnprocessableEntityException(`只有已生效合同可以关联采购承诺记录，当前状态: ${contract.status}`);
        }
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

    async #assertSourceFactNotMapped(sourceType: string, sourceId: string, actionLabel: string): Promise<void> {
        const currentMapping = await this.repo.findCurrentCostMappingBySource(sourceType, sourceId);
        if (currentMapping) {
            throw new UnprocessableEntityException(
                `${sourceType} ${sourceId} 已存在统一成本映射 ${currentMapping.id}，当前不允许继续${actionLabel}；如需调整请走替代/作废链`
            );
        }
    }

    #buildPayableAllowedActions(payable: PayableRecord, hasCurrentCostMapping: boolean): string[] {
        if (payable.status === 'completed' || payable.status === 'closed' || payable.status === 'voided') {
            return [];
        }
        if (hasCurrentCostMapping) {
            if (payable.status === 'partially-paid') {
                return ['complete'];
            }
            return ['partial', 'complete'];
        }
        if (payable.status === 'partially-paid') {
            return ['complete', 'close'];
        }
        return ['update', 'partial', 'complete', 'close', 'void'];
    }

    #buildInvoiceAllowedActions(invoice: InvoiceRecord, hasCurrentCostMapping: boolean): string[] {
        if (hasCurrentCostMapping) {
            return [];
        }
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

    #assertPaidAmountNotExceedRegisteredAmount(paidAmount: string | number, registeredAmount: string | number): void {
        if (Number(paidAmount) > Number(registeredAmount)) {
            throw new UnprocessableEntityException('已支付金额不得超过登记金额');
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

    readonly #toPayableSummary = (entity: PayableRecord): PayableRecordSummary => ({
        id: entity.id,
        projectId: entity.projectId,
        contractId: entity.contractId ?? null,
        vendorName: entity.vendorName,
        costCategory: entity.costCategory,
        payableDescription: entity.payableDescription,
        currency: entity.currency,
        registeredAmount: typeof entity.registeredAmount === 'string' ? entity.registeredAmount : String(entity.registeredAmount),
        paidAmount: typeof entity.paidAmount === 'string' ? entity.paidAmount : String(entity.paidAmount),
        expectedPaymentDate: this.#toDateOnly(entity.expectedPaymentDate),
        status: entity.status,
        evidenceSummary: entity.evidenceSummary ?? null,
        attachmentCount: entity.attachmentCount,
        closedAt: entity.closedAt?.toISOString() ?? null,
        closeReason: entity.closeReason ?? null,
        voidedAt: entity.voidedAt?.toISOString() ?? null,
        voidReason: entity.voidReason ?? null,
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
        payableRecordId: entity.payableRecordId ?? null,
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
