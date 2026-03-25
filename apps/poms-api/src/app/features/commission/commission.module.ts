import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Project } from '../project/project.entity';
import { CommissionCalculation } from './commission-calculation.entity';
import { CommissionPayout } from './commission-payout.entity';
import { CommissionRoleAssignment } from './commission-role-assignment.entity';
import { CommissionRuleVersion } from './commission-rule-version.entity';
import { CommissionController } from './commission.controller';
import { CommissionRepository } from './commission.repository';
import { CommissionService } from './commission.service';

@Module({
    imports: [MikroOrmModule.forFeature([Project, CommissionRuleVersion, CommissionRoleAssignment, CommissionCalculation, CommissionPayout])],
    controllers: [CommissionController],
    providers: [CommissionRepository, CommissionService],
    exports: [CommissionService]
})
export class CommissionModule {}
