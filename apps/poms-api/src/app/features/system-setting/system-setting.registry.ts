import { SystemSettingKeyValue, SystemSettingValueTypeValue, type SystemSettingKey, type SystemSettingValueType } from '@poms/shared-contracts';

export interface IntegerSystemSettingDefinition {
    key: SystemSettingKey;
    displayName: string;
    description: string;
    group: string;
    valueType: Extract<SystemSettingValueType, 'integer'>;
    defaultValue: number;
    minValue: number;
    maxValue: number;
    unit: string;
}

export type SystemSettingDefinition = IntegerSystemSettingDefinition;

export const ATTACHMENT_MAX_UPLOAD_SIZE_MIN_MB = 1;
export const ATTACHMENT_MAX_UPLOAD_SIZE_MAX_MB = 500;
export const ATTACHMENT_MAX_UPLOAD_SIZE_DEFAULT_MB = 50;
export const BYTES_PER_MB = 1024 * 1024;

export const SYSTEM_SETTING_DEFINITIONS: readonly SystemSettingDefinition[] = [
    {
        key: SystemSettingKeyValue.AttachmentMaxUploadSizeMb,
        displayName: '附件上传大小上限',
        description: '控制单个附件上传会话允许声明的最大文件大小。Nginx client_max_body_size 必须大于或等于该值。',
        group: '附件',
        valueType: SystemSettingValueTypeValue.Integer,
        defaultValue: ATTACHMENT_MAX_UPLOAD_SIZE_DEFAULT_MB,
        minValue: ATTACHMENT_MAX_UPLOAD_SIZE_MIN_MB,
        maxValue: ATTACHMENT_MAX_UPLOAD_SIZE_MAX_MB,
        unit: 'MB'
    }
];

export const SYSTEM_SETTING_DEFINITION_BY_KEY = new Map<SystemSettingKey, SystemSettingDefinition>(
    SYSTEM_SETTING_DEFINITIONS.map((definition) => [definition.key, definition])
);
