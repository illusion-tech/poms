import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
    InvoiceRecordDetailView,
    InvoiceRecordSummary,
    PaymentRecordSummary,
    ReceiptRecordSummary,
    UserPayload
} from '@poms/shared-contracts';
import {
    CloseInvoiceRecordRequestDto,
    ConfirmPaymentRecordRequestDto,
    ConfirmReceiptRecordRequestDto,
    CreateInvoiceRecordRequestDto,
    CreatePaymentRecordRequestDto,
    CreateReceiptRecordRequestDto,
    InvoiceRecordDetailViewDto,
    InvoiceRecordDto,
    InvoiceRecordListDto,
    MarkInvoiceExceptionRequestDto,
    PaymentRecordDto,
    PaymentRecordListDto,
    ReceiptRecordDto,
    ReceiptRecordListDto,
    ResolveInvoiceExceptionRequestDto,
    UpdateInvoiceRecordRequestDto
} from '@poms/api-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { ContractFinanceService } from './contract-finance.service';

@ApiTags('ContractFinance')
@ApiBearerAuth()
@Controller('contract-finance')
export class ContractFinanceController {
    constructor(private readonly contractFinanceService: ContractFinanceService) {}

    @Get('contracts/:contractId/receipts')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取合同回款记录列表' })
    @ApiOkResponse({ type: ReceiptRecordListDto })
    listReceipts(@Param('contractId') contractId: string): Promise<ReceiptRecordSummary[]> {
        return this.contractFinanceService.listReceipts(contractId);
    }

    @Post('contracts/:contractId/receipts')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '登记合同回款记录' })
    @ApiCreatedResponse({ type: ReceiptRecordDto })
    createReceipt(
        @Param('contractId') contractId: string,
        @Body() body: CreateReceiptRecordRequestDto
    ): Promise<ReceiptRecordSummary> {
        return this.contractFinanceService.createReceipt(contractId, body);
    }

    @Post('contracts/:contractId/receipts/:id/confirm')
    @HasPermissions('contract:finance:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '确认合同回款记录生效' })
    @ApiOkResponse({ type: ReceiptRecordDto })
    confirmReceipt(
        @Param('contractId') contractId: string,
        @Param('id') id: string,
        @Request() req: { user: UserPayload },
        @Body() body: ConfirmReceiptRecordRequestDto
    ): Promise<ReceiptRecordSummary> {
        return this.contractFinanceService.confirmReceipt(contractId, id, req.user.sub, body);
    }

    @Get('projects/:projectId/invoices')
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

    @Post('projects/:projectId/invoices')
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

    @Post('invoice-records/:id/mark-exception')
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

    @Post('invoice-records/:id/resolve-exception')
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

    @Post('invoice-records/:id/close')
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

    @Get('projects/:projectId/payments')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取项目付款记录列表' })
    @ApiOkResponse({ type: PaymentRecordListDto })
    listPayments(@Param('projectId') projectId: string): Promise<PaymentRecordSummary[]> {
        return this.contractFinanceService.listPayments(projectId);
    }

    @Post('projects/:projectId/payments')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '登记项目付款记录' })
    @ApiCreatedResponse({ type: PaymentRecordDto })
    createPayment(
        @Param('projectId') projectId: string,
        @Body() body: CreatePaymentRecordRequestDto
    ): Promise<PaymentRecordSummary> {
        return this.contractFinanceService.createPayment(projectId, body);
    }

    @Post('projects/:projectId/payments/:id/confirm')
    @HasPermissions('contract:finance:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '确认项目付款记录生效' })
    @ApiOkResponse({ type: PaymentRecordDto })
    confirmPayment(
        @Param('projectId') projectId: string,
        @Param('id') id: string,
        @Request() req: { user: UserPayload },
        @Body() body: ConfirmPaymentRecordRequestDto
    ): Promise<PaymentRecordSummary> {
        return this.contractFinanceService.confirmPayment(projectId, id, req.user.sub, body);
    }
}
