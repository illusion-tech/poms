import { Inject, BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogResultValue, SystemSettingKeySchema, SystemSettingKeyValue, type SystemSettingKey, type SystemSettingList, type SystemSettingSummary, type UpdateSystemSettingRequest } from '@poms/shared-contracts';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { SystemSetting } from './system-setting.entity';
import { BYTES_PER_MB, SYSTEM_SETTING_DEFINITION_BY_KEY, SYSTEM_SETTING_DEFINITIONS, type IntegerSystemSettingDefinition, type SystemSettingDefinition } from './system-setting.registry';
import { SystemSettingRepository } from './system-setting.repository';

const SYSTEM_SETTING_AUDIT_TARGET_TYPE = 'SystemSetting';

@Injectable()
export class SystemSettingService {
    constructor(
        @Inject(SystemSettingRepository) private readonly repository: SystemSettingRepository,
        @Inject(RuntimeAuditService) private readonly runtimeAuditService: RuntimeAuditService
    ) {}

    async listSystemSettings(): Promise<SystemSettingList> {
        const settings = await this.repository.findAll();
        const byKey = new Map(settings.map((setting) => [setting.key, setting]));
        return SYSTEM_SETTING_DEFINITIONS.map((definition) => this.toSummary(definition, byKey.get(definition.key) ?? null));
    }

    async getSystemSetting(rawKey: string): Promise<SystemSettingSummary> {
        const definition = this.requireDefinition(rawKey);
        const setting = await this.repository.findByKey(definition.key);
        return this.toSummary(definition, setting);
    }

    async updateSystemSetting(rawKey: string, request: UpdateSystemSettingRequest, operatorId?: string | null, requestId?: string | null): Promise<SystemSettingSummary> {
        const definition = this.requireDefinition(rawKey);
        const value = this.normalizeIntegerValue(definition, request.value);
        const existing = await this.repository.findByKey(definition.key);

        if (!existing) {
            if (request.expectedVersion !== undefined && request.expectedVersion !== 0) {
                throw new ConflictException(`System setting ${definition.key} version conflict: expected ${request.expectedVersion}, actual 0`);
            }

            const created = this.repository.create({
                key: definition.key,
                valueType: definition.valueType,
                valueJson: value,
                rowVersion: 1,
                updatedBy: operatorId ?? null
            });
            await this.repository.saveAll([created]);
            await this.recordUpdateAudit(definition, operatorId, requestId, null, created);
            return this.toSummary(definition, created);
        }

        if (request.expectedVersion !== undefined && request.expectedVersion !== existing.rowVersion) {
            throw new ConflictException(`System setting ${definition.key} version conflict: expected ${request.expectedVersion}, actual ${existing.rowVersion}`);
        }

        const beforeSnapshot = this.toSummary(definition, existing);
        existing.valueType = definition.valueType;
        existing.valueJson = value;
        existing.updatedBy = operatorId ?? null;

        await this.repository.saveAll([existing]);
        await this.recordUpdateAudit(definition, operatorId, requestId, beforeSnapshot, existing);
        return this.toSummary(definition, existing);
    }

    async getIntegerValue(key: SystemSettingKey): Promise<number> {
        const definition = this.requireDefinition(key);
        const setting = await this.repository.findByKey(definition.key);
        return this.readIntegerValue(definition, setting);
    }

    async getAttachmentMaxUploadSizeBytes(): Promise<number> {
        const maxUploadSizeMb = await this.getIntegerValue(SystemSettingKeyValue.AttachmentMaxUploadSizeMb);
        return maxUploadSizeMb * BYTES_PER_MB;
    }

    private requireDefinition(rawKey: string): SystemSettingDefinition {
        const parsed = SystemSettingKeySchema.safeParse(rawKey);
        if (!parsed.success) {
            throw new NotFoundException(`System setting ${rawKey} not found`);
        }

        const definition = SYSTEM_SETTING_DEFINITION_BY_KEY.get(parsed.data);
        if (!definition) {
            throw new NotFoundException(`System setting ${rawKey} not found`);
        }

        return definition;
    }

    private normalizeIntegerValue(definition: IntegerSystemSettingDefinition, value: number): number {
        if (!Number.isInteger(value)) {
            throw new BadRequestException(`System setting ${definition.key} must be an integer`);
        }
        if (value < definition.minValue || value > definition.maxValue) {
            throw new BadRequestException(`System setting ${definition.key} must be between ${definition.minValue} and ${definition.maxValue}`);
        }
        return value;
    }

    private readIntegerValue(definition: IntegerSystemSettingDefinition, setting: SystemSetting | null): number {
        if (!setting) {
            return definition.defaultValue;
        }
        if (setting.valueType !== definition.valueType) {
            throw new BadRequestException(`System setting ${definition.key} value type is invalid`);
        }
        if (typeof setting.valueJson !== 'number') {
            throw new BadRequestException(`System setting ${definition.key} value is invalid`);
        }
        return this.normalizeIntegerValue(definition, setting.valueJson);
    }

    private toSummary(definition: SystemSettingDefinition, setting: SystemSetting | null): SystemSettingSummary {
        return {
            key: definition.key,
            displayName: definition.displayName,
            description: definition.description,
            group: definition.group,
            valueType: definition.valueType,
            value: this.readIntegerValue(definition, setting),
            defaultValue: definition.defaultValue,
            minValue: definition.minValue,
            maxValue: definition.maxValue,
            unit: definition.unit,
            rowVersion: setting?.rowVersion ?? 0,
            updatedAt: setting?.updatedAt?.toISOString() ?? null,
            updatedBy: setting?.updatedBy ?? null
        };
    }

    private async recordUpdateAudit(definition: SystemSettingDefinition, operatorId: string | null | undefined, requestId: string | null | undefined, beforeSnapshot: SystemSettingSummary | null, setting: SystemSetting): Promise<void> {
        await this.runtimeAuditService.recordAuditLog({
            eventType: 'platform.system_setting.updated',
            targetType: SYSTEM_SETTING_AUDIT_TARGET_TYPE,
            targetId: definition.key,
            operatorId: operatorId ?? null,
            requestId: requestId ?? null,
            result: AuditLogResultValue.Success,
            beforeSnapshot,
            afterSnapshot: this.toSummary(definition, setting)
        });
    }
}
