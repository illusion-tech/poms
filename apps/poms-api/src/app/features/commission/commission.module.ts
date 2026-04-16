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
import { CommissionRoleAssignmentController } from './commission-role-assignment.controller';
import { CommissionPayout } from './commission-payout.entity';
import { CommissionRoleAssignment } from './commission-role-assignment.entity';
import { CommissionRuleVersion } from './commission-rule-version.entity';
import { CommissionController } from './commission.controller';
import { CommissionRepository } from './commission.repository';
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
            CommissionCalculation,
            CommissionPayout,
            CommissionAdjustment
        ]),
        ApprovalModule
    ],
    controllers: [CommissionController, CommissionRoleAssignmentController],
    providers: [CommissionRepository, CommissionService],
    exports: [CommissionService]
})
export class CommissionModule {}
