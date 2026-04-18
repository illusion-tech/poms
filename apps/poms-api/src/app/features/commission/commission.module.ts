import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ApprovalModule } from '../approval/approval.module';
import { ApprovalSummarySnapshot } from '../approval-summary/approval-summary.entity';
import { Contract } from '../contract/contract.entity';
import { PaymentRecord } from '../contract-finance/payment-record.entity';
import { ReceiptRecord } from '../contract-finance/receipt-record.entity';
import { ProjectHandover, ProjectReceiptJudgmentFreeze } from '../project-handover/project-handover.entity';
import { Project } from '../project/project.entity';
import { CommissionAdjustment } from './commission-adjustment.entity';
import { CommissionCalculation } from './commission-calculation.entity';
import { CommissionDepartureExceptionDecisionController } from './commission-departure-exception-decision.controller';
import { CommissionFreezeChangeRequestController } from './commission-freeze-change-request.controller';
import { CommissionFreezeChangeRequest } from './commission-freeze-change-request.entity';
import { CommissionFreezeDisputeController } from './commission-freeze-dispute.controller';
import { CommissionFreezeDisputeRecord } from './commission-freeze-dispute-record.entity';
import { CommissionRoleAssignmentController } from './commission-role-assignment.controller';
import { CommissionPayout } from './commission-payout.entity';
import { CommissionRoleAssignment } from './commission-role-assignment.entity';
import { CommissionRuleVersion } from './commission-rule-version.entity';
import { CommissionController } from './commission.controller';
import { CommissionDepartureExceptionDecision } from './commission-departure-exception-decision.entity';
import { CommissionFinalSettlementSnapshot } from './commission-final-settlement-snapshot.entity';
import { CommissionRepository } from './commission.repository';
import { CommissionRuleExplanationSnapshot } from './commission-rule-explanation-snapshot.entity';
import { CommissionService } from './commission.service';

@Module({
    imports: [
        MikroOrmModule.forFeature([
            Project,
            Contract,
            ReceiptRecord,
            PaymentRecord,
            ProjectHandover,
            ProjectReceiptJudgmentFreeze,
            ApprovalSummarySnapshot,
            CommissionRuleVersion,
            CommissionRoleAssignment,
            CommissionFreezeDisputeRecord,
            CommissionFreezeChangeRequest,
            CommissionCalculation,
            CommissionPayout,
            CommissionAdjustment,
            CommissionDepartureExceptionDecision,
            CommissionFinalSettlementSnapshot,
            CommissionRuleExplanationSnapshot
        ]),
        ApprovalModule
    ],
    controllers: [
        CommissionController,
        CommissionRoleAssignmentController,
        CommissionDepartureExceptionDecisionController,
        CommissionFreezeDisputeController,
        CommissionFreezeChangeRequestController
    ],
    providers: [CommissionRepository, CommissionService],
    exports: [CommissionService]
})
export class CommissionModule {}
