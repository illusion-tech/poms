// Read-only construction of authenticated validation cases for Root's common
// real HTTP runner. No requests, fixtures, users, or provider objects are made.
import { readFileSync } from 'node:fs';
const corpus = JSON.parse(readFileSync(new URL('./i-dto-golden.json', import.meta.url), 'utf8'));
const id = '95000000-0000-4000-8000-0000000000ff';
const endpoints = {
    AttachmentStorageProviderConfigListQuery: ['GET', '/api/platform/attachment-storage-providers'],
    CreateAttachmentStorageProviderConfigRequest: ['POST', '/api/platform/attachment-storage-providers'],
    UpdateAttachmentStorageProviderConfigRequest: ['PATCH', `/api/platform/attachment-storage-providers/${id}`],
    TestAttachmentStorageProviderConnectionRequest: ['POST', `/api/platform/attachment-storage-providers/${id}:testConnection`],
    SetDefaultAttachmentStorageProviderRequest: ['POST', `/api/platform/attachment-storage-providers/${id}:set-default`]
};
export function validationCases() {
    return corpus.cases.filter(c => !c.expected.success && c.schema !== 'AttachmentStorageProviderConfigListQuery').map((c, index) => {
        const [method, path] = endpoints[c.schema];
        return { name: `I DTO ${index} ${c.schema}`, method, path, rawBody: c.inputRaw, contentType: 'application/json', status: 400, body: { statusCode: 400, message: 'Validation failed', errors: c.expected.errors } };
    });
}
export const operationIds = [
    'AttachmentStorageProviderController_listAttachmentStorageProviderConfigs',
    'AttachmentStorageProviderController_createAttachmentStorageProviderConfig',
    'AttachmentStorageProviderController_getAttachmentStorageProviderConfig',
    'AttachmentStorageProviderController_updateAttachmentStorageProviderConfig',
    'AttachmentStorageProviderController_setDefaultAttachmentStorageProvider',
    'AttachmentStorageProviderController_testAttachmentStorageProviderConnection'
];
