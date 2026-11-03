import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ProjectModule } from '../project/project.module';
import {
    CommercialBaselineDiffItem,
    CommercialBaselineDiffResult,
    CommercialBaselineReviewRecord,
    CommercialReleaseBaseline
} from './commercial-release-baseline.entity';
import { CommercialReleaseBaselineRepository } from './commercial-release-baseline.repository';
import { ContractReadinessController } from './contract-readiness.controller';
import { ContractReadinessPackage, ContractReadinessPackageItem } from './contract-readiness-package.entity';
import { ContractReadinessPackageRepository } from './contract-readiness-package.repository';
import { ContractReadinessService } from './contract-readiness.service';

@Module({
    imports: [
        MikroOrmModule.forFeature([
            CommercialReleaseBaseline,
            CommercialBaselineDiffResult,
            CommercialBaselineDiffItem,
            CommercialBaselineReviewRecord,
            ContractReadinessPackage,
            ContractReadinessPackageItem
        ]),
        ProjectModule
    ],
    controllers: [ContractReadinessController],
    providers: [CommercialReleaseBaselineRepository, ContractReadinessPackageRepository, ContractReadinessService],
    exports: [ContractReadinessService, CommercialReleaseBaselineRepository]
})
export class ContractReadinessModule {}
