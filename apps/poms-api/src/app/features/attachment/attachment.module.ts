import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Contract } from '../contract/contract.entity';
import { Customer } from '../customer/customer.entity';
import { DictionaryModule } from '../dictionary/dictionary.module';
import { Lead } from '../lead/lead.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { SalesFollowUpRecord } from '../sales-follow-up/sales-follow-up-record.entity';
import { AttachmentController } from './attachment.controller';
import { Attachment, AttachmentLink } from './attachment.entity';
import { AttachmentRepository } from './attachment.repository';
import { AttachmentService } from './attachment.service';
import { AttachmentStorageService } from './attachment-storage.service';

@Module({
    imports: [MikroOrmModule.forFeature([Attachment, AttachmentLink, Customer, Lead, Project, Contract, SalesFollowUpRecord, PlatformUser]), DictionaryModule],
    controllers: [AttachmentController],
    providers: [AttachmentRepository, AttachmentService, AttachmentStorageService],
    exports: [AttachmentRepository, AttachmentService, AttachmentStorageService]
})
export class AttachmentModule {}
