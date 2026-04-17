import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
    InvoiceRecordDetailView,
    InvoiceRecordSummary,
    PayableRecordDetailView,
    PayableRecordSummary,
    PaymentRecordSummary,
    ReceiptRecordSummary,
    UserPayload
} from '@poms/shared-contracts';
import {
    ClosePayableRecordRequestDto,
    CloseInvoiceRecordRequestDto,
    ConfirmPaymentRecordRequestDto,
    ConfirmReceiptRecordRequestDto,
    CreatePayableRecordRequestDto,
    CreateInvoiceRecordRequestDto,
    CreatePaymentRecordRequestDto,
    CreateReceiptRecordRequestDto,
    InvoiceRecordDetailViewDto,
    InvoiceRecordDto,
    InvoiceRecordListDto,
    MarkInvoiceExceptionRequestDto,
    PayableRecordDetailViewDto,
    PayableRecordDto,
    PayableRecordListDto,
    PaymentRecordDto,
    PaymentRecordListDto,
    ReceiptRecordDto,
    ReceiptRecordListDto,
    ResolveInvoiceExceptionRequestDto,
    UpdatePayableRecordRequestDto,
    UpdateInvoiceRecordRequestDto,
    VoidPayableRecordRequestDto
} from '@poms/api-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { ContractFinanceService } from './contract-finance.service';

@ApiTags('ContractFinance')
@ApiBearerAuth()
@Controller()
export class ContractFinanceController {
    constructor(private readonly contractFinanceService: ContractFinanceService) {}

    @Get('contracts/:contractId/receipt-records')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取合同回款记录列表' })
    @ApiOkResponse({ type: ReceiptRecordListDto })
    listReceipts(@Param('contractId') contractId: string): Promise<ReceiptRecordSummary[]> {
        return this.contractFinanceService.listReceipts(contractId);
    }

    @Post('contracts/:contractId/receipt-records')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '登记合同回款记录' })
    @ApiCreatedResponse({ type: ReceiptRecordDto })
    createReceipt(
        @Param('contractId') contractId: string,
        @Body() body: CreateReceiptRecordRequestDto
    ): Promise<ReceiptRecordSummary> {
        return this.contractFinanceService.createReceipt(contractId, body);
    }

    @Post('receipt-records/:id\\:confirm')
    @HasPermissions('contract:finance:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '确认合同回款记录生效' })
    @ApiOkResponse({ type: ReceiptRecordDto })
    confirmReceipt(
        @Param('id') id: string,
        @Request() req: { user: UserPayload },
        @Body() body: ConfirmReceiptRecordRequestDto
    ): Promise<ReceiptRecordSummary> {
        return this.contractFinanceService.confirmReceipt(id, req.user.sub, body);
    }

    @Get('projects/:projectId/payable-records')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取项目采购承诺记录列表' })
    @ApiOkResponse({ type: PayableRecordListDto })
    listPayables(@Param('projectId') projectId: string): Promise<PayableRecordSummary[]> {
        return this.contractFinanceService.listPayables(projectId);
    }

    @Get('payable-records/:id')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取采购承诺记录详情' })
    @ApiOkResponse({ type: PayableRecordDetailViewDto })
    getPayable(@Param('id') id: string): Promise<PayableRecordDetailView> {
        return this.contractFinanceService.getPayable(id);
    }

    @Post('projects/:projectId/payable-records')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '登记项目采购承诺记录' })
    @ApiCreatedResponse({ type: PayableRecordDto })
    createPayable(
        @Param('projectId') projectId: string,
        @Body() body: CreatePayableRecordRequestDto
    ): Promise<PayableRecordSummary> {
        return this.contractFinanceService.createPayable(projectId, body);
    }

    @Patch('payable-records/:id')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '更新采购承诺记录' })
    @ApiOkResponse({ type: PayableRecordDto })
    updatePayable(
        @Param('id') id: string,
        @Body() body: UpdatePayableRecordRequestDto
    ): Promise<PayableRecordSummary> {
        return this.contractFinanceService.updatePayable(id, body);
    }

    @Post('payable-records/:id\\:close')
    @HasPermissions('contract:finance:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '关闭采购承诺记录' })
    @ApiOkResponse({ type: PayableRecordDto })
    closePayable(
        @Param('id') id: string,
        @Body() body: ClosePayableRecordRequestDto
    ): Promise<PayableRecordSummary> {
        return this.contractFinanceService.closePayable(id, body);
    }

    @Post('payable-records/:id\\:void')
    @HasPermissions('contract:finance:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '作废采购承诺记录' })
    @ApiOkResponse({ type: PayableRecordDto })
    voidPayable(
        @Param('id') id: string,
        @Body() body: VoidPayableRecordRequestDto
    ): Promise<PayableRecordSummary> {
        return this.contractFinanceService.voidPayable(id, body);
    }

    @Get('projects/:projectId/invoice-records')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取项目发票记录列表' })
    @ApiOkResponse({ type: InvoiceRecordListDto })
    listInvoices(@Param('projectId') projectId: string): Promise<InvoiceRecordSummary[]> {
        return this.contractFinanceService.listInvoices(projectId);
    }

    @Get('invoice-records/:id')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取发票记录详情' })
    @ApiOkResponse({ type: InvoiceRecordDetailViewDto })
    getInvoice(@Param('id') id: string): Promise<InvoiceRecordDetailView> {
        return this.contractFinanceService.getInvoice(id);
    }

    @Post('projects/:projectId/invoice-records')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '登记项目发票记录' })
    @ApiCreatedResponse({ type: InvoiceRecordDto })
    createInvoice(
        @Param('projectId') projectId: string,
        @Body() body: CreateInvoiceRecordRequestDto
    ): Promise<InvoiceRecordSummary> {
        return this.contractFinanceService.createInvoice(projectId, body);
    }

    @Patch('invoice-records/:id')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '更新发票记录' })
    @ApiOkResponse({ type: InvoiceRecordDto })
    updateInvoice(
        @Param('id') id: string,
        @Body() body: UpdateInvoiceRecordRequestDto
    ): Promise<InvoiceRecordSummary> {
        return this.contractFinanceService.updateInvoice(id, body);
    }

    @Post('invoice-records/:id\\:markException')
    @HasPermissions('contract:finance:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '标记发票异常' })
    @ApiOkResponse({ type: InvoiceRecordDto })
    markInvoiceException(
        @Param('id') id: string,
        @Body() body: MarkInvoiceExceptionRequestDto
    ): Promise<InvoiceRecordSummary> {
        return this.contractFinanceService.markInvoiceException(id, body);
    }

    @Post('invoice-records/:id\\:resolveException')
    @HasPermissions('contract:finance:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '解决发票异常' })
    @ApiOkResponse({ type: InvoiceRecordDto })
    resolveInvoiceException(
        @Param('id') id: string,
        @Body() body: ResolveInvoiceExceptionRequestDto
    ): Promise<InvoiceRecordSummary> {
        return this.contractFinanceService.resolveInvoiceException(id, body);
    }

    @Post('invoice-records/:id\\:close')
    @HasPermissions('contract:finance:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '关闭发票记录' })
    @ApiOkResponse({ type: InvoiceRecordDto })
    closeInvoiceRecord(
        @Param('id') id: string,
        @Body() body: CloseInvoiceRecordRequestDto
    ): Promise<InvoiceRecordSummary> {
        return this.contractFinanceService.closeInvoiceRecord(id, body);
    }

    @Get('projects/:projectId/payment-records')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取项目付款记录列表' })
    @ApiOkResponse({ type: PaymentRecordListDto })
    listPayments(@Param('projectId') projectId: string): Promise<PaymentRecordSummary[]> {
        return this.contractFinanceService.listPayments(projectId);
    }

    @Post('projects/:projectId/payment-records')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '登记项目付款记录' })
    @ApiCreatedResponse({ type: PaymentRecordDto })
    createPayment(
        @Param('projectId') projectId: string,
        @Body() body: CreatePaymentRecordRequestDto
    ): Promise<PaymentRecordSummary> {
        return this.contractFinanceService.createPayment(projectId, body);
    }

    @Post('payment-records/:id\\:confirm')
    @HasPermissions('contract:finance:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '确认项目付款记录生效' })
    @ApiOkResponse({ type: PaymentRecordDto })
    confirmPayment(
        @Param('id') id: string,
        @Request() req: { user: UserPayload },
        @Body() body: ConfirmPaymentRecordRequestDto
    ): Promise<PaymentRecordSummary> {
        return this.contractFinanceService.confirmPayment(id, req.user.sub, body);
    }
}
