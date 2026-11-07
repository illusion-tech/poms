import { EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import type { SystemSettingKey } from '@poms/shared-contracts';
import { SystemSetting } from './system-setting.entity';

@Injectable()
export class SystemSettingRepository {
    constructor(
        @InjectRepository(SystemSetting)
        private readonly repository: EntityRepository<SystemSetting>
    ) {}

    findAll(): Promise<SystemSetting[]> {
        return this.repository.findAll({ orderBy: { key: QueryOrder.ASC } });
    }

    findByKey(key: SystemSettingKey): Promise<SystemSetting | null> {
        return this.repository.findOne({ key });
    }

    create(input: ConstructorParameters<typeof SystemSetting>[0]): SystemSetting {
        return this.repository.create(input);
    }

    async saveAll(entities: SystemSetting[]): Promise<void> {
        await this.repository.getEntityManager().persist(entities).flush();
    }
}
