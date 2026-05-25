import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AuditLogResultValue, SystemSettingKeyValue, SystemSettingValueTypeValue } from '@poms/shared-contracts';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { SystemSetting } from './system-setting.entity';
import { BYTES_PER_MB } from './system-setting.registry';
import { SystemSettingRepository } from './system-setting.repository';
import { SystemSettingService } from './system-setting.service';

describe('SystemSettingService', () => {
    const systemSettingAuditTargetType = 'SystemSetting';
    const operatorId = '00000000-0000-4000-8000-000000000001';
    let repository: {
        findAll: jest.Mock;
        findByKey: jest.Mock;
        create: jest.Mock;
        saveAll: jest.Mock;
    };
    let runtimeAuditService: {
        recordAuditLog: jest.Mock;
    };
    let service: SystemSettingService;

    beforeEach(() => {
        repository = {
            findAll: jest.fn().mockResolvedValue([]),
            findByKey: jest.fn().mockResolvedValue(null),
            create: jest.fn((input) => createSetting(input)),
            saveAll: jest.fn(async (entities: SystemSetting[]) => {
                for (const entity of entities) {
                    entity.rowVersion += 1;
                    entity.updatedAt = new Date('2026-05-26T00:00:00.000Z');
                }
            })
        };
        runtimeAuditService = {
            recordAuditLog: jest.fn().mockResolvedValue(undefined)
        };
        service = new SystemSettingService(repository as never as SystemSettingRepository, runtimeAuditService as never as RuntimeAuditService);
    });

    it('returns the default attachment max upload size setting', async () => {
        const result = await service.listSystemSettings();

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            key: SystemSettingKeyValue.AttachmentMaxUploadSizeMb,
            value: 50,
            defaultValue: 50,
            minValue: 1,
            maxValue: 500,
            unit: 'MB',
            rowVersion: 0
        });
    });

    it('updates a valid integer value and records runtime audit', async () => {
        const existing = createSetting({ valueJson: 50, rowVersion: 1 });
        repository.findByKey.mockResolvedValue(existing);

        const result = await service.updateSystemSetting(SystemSettingKeyValue.AttachmentMaxUploadSizeMb, { value: 128, expectedVersion: 1 }, operatorId, 'request-1');

        expect(existing.valueJson).toBe(128);
        expect(existing.updatedBy).toBe(operatorId);
        expect(result.rowVersion).toBe(2);
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'platform.system_setting.updated',
                targetType: systemSettingAuditTargetType,
                targetId: SystemSettingKeyValue.AttachmentMaxUploadSizeMb,
                operatorId,
                requestId: 'request-1',
                result: AuditLogResultValue.Success,
                beforeSnapshot: expect.objectContaining({ value: 50 }),
                afterSnapshot: expect.objectContaining({ value: 128 })
            })
        );
    });

    it.each([0, 501, 1.5, '50'])('rejects invalid attachment max upload size %p', async (value) => {
        repository.findByKey.mockResolvedValue(createSetting());

        await expect(service.updateSystemSetting(SystemSettingKeyValue.AttachmentMaxUploadSizeMb, { value: value as never })).rejects.toThrow(BadRequestException);

        expect(repository.saveAll).not.toHaveBeenCalled();
    });

    it('rejects unknown keys', async () => {
        await expect(service.getSystemSetting('unknown.setting')).rejects.toThrow(NotFoundException);
        await expect(service.updateSystemSetting('unknown.setting', { value: 50 })).rejects.toThrow(NotFoundException);
    });

    it('rejects expected version conflicts before mutating the setting', async () => {
        const existing = createSetting({ valueJson: 50, rowVersion: 3 });
        repository.findByKey.mockResolvedValue(existing);

        await expect(service.updateSystemSetting(SystemSettingKeyValue.AttachmentMaxUploadSizeMb, { value: 128, expectedVersion: 2 }, operatorId)).rejects.toThrow(ConflictException);

        expect(existing.valueJson).toBe(50);
        expect(repository.saveAll).not.toHaveBeenCalled();
    });

    it('converts the attachment max upload size setting to bytes', async () => {
        repository.findByKey.mockResolvedValue(createSetting({ valueJson: 125 }));

        await expect(service.getAttachmentMaxUploadSizeBytes()).resolves.toBe(125 * BYTES_PER_MB);
    });

    function createSetting(overrides: Partial<SystemSetting> = {}): SystemSetting {
        return Object.assign(new SystemSetting(), {
            key: SystemSettingKeyValue.AttachmentMaxUploadSizeMb,
            valueType: SystemSettingValueTypeValue.Integer,
            valueJson: 50,
            rowVersion: 1,
            createdAt: new Date('2026-05-26T00:00:00.000Z'),
            updatedAt: new Date('2026-05-26T00:00:00.000Z'),
            updatedBy: null,
            ...overrides
        });
    }
});
