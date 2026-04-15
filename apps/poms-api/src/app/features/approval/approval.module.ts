import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { CommissionAdjustment } from '../commission/commission-adjustment.entity';
import { CommissionPayout } from '../commission/commission-payout.entity';
import { Contract } from '../contract/contract.entity';
import { ApprovalController } from './approval.controller';
import { ApprovalRecord } from './approval-record.entity';
import { ApprovalService } from './approval.service';
import { ConfirmationParticipant, ConfirmationRecord } from './confirmation-record.entity';
import { ConfirmationService } from './confirmation.service';
import { TodoItem } from './todo-item.entity';

@Module({
    imports: [MikroOrmModule.forFeature([ApprovalRecord, ConfirmationRecord, ConfirmationParticipant, TodoItem, Contract, CommissionPayout, CommissionAdjustment])],
    controllers: [ApprovalController],
    providers: [ApprovalService, ConfirmationService],
    exports: [ApprovalService, ConfirmationService]
})
export class ApprovalModule {}
