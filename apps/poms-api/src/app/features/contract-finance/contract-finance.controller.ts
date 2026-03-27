import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
    PaymentRecordSummary,
    ReceiptRecordSummary,
    UserPayload
} from '@poms/shared-contracts';
import {
    ConfirmPaymentRecordRequestDto,
    ConfirmReceiptRecordRequestDto,
    CreatePaymentRecordRequestDto,
    CreateReceiptRecordRequestDto,
    PaymentRecordDto,
    PaymentRecordListDto,
    ReceiptRecordDto,
    ReceiptRecordListDto
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
