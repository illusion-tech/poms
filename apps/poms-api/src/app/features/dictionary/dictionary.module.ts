import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Attachment } from '../attachment/attachment.entity';
import { Lead } from '../lead/lead.entity';
import { ExpenseRecord } from '../project-cost/expense-record.entity';
import { SalesFollowUpRecord } from '../sales-follow-up/sales-follow-up-record.entity';
import { DictionaryController } from './dictionary.controller';
import { DictionaryItem } from './dictionary-item.entity';
import { DictionaryRepository } from './dictionary.repository';
import { DictionaryService } from './dictionary.service';

@Module({
    imports: [MikroOrmModule.forFeature([DictionaryItem, Attachment, SalesFollowUpRecord, ExpenseRecord, Lead])],
    controllers: [DictionaryController],
    providers: [DictionaryRepository, DictionaryService],
    exports: [DictionaryRepository, DictionaryService]
})
export class DictionaryModule {}
