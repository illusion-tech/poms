import { NotFoundException, type INestApplication } from '@nestjs/common';
import { HEADERS_METADATA, HTTP_CODE_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import type { PermissionKey, UserPayload } from '@poms/shared-contracts';
import type { Server } from 'node:http';
import { PERMISSIONS_KEY } from '../../core/auth/decorators/has-permissions.decorator';
import { AttachmentHandoverController } from './attachment-handover.controller';
import { AttachmentService } from './attachment.service';

// Transport binding only: the real Nest router/decorators receive HTTP, while
// throw-only service spies prevent fabricated checklist/package success. This
// suite does not certify authentication, database facts or K business behavior.
describe('AttachmentHandoverController canonical parameter binding', () => {
    const principal: UserPayload = {
        sub: '82000000-0000-4000-8000-000000000099',
        username: 'route-binding-only',
        permissions: ['project:read', 'project:write']
    };
    const service = {
        getProjectHandoverAttachmentChecklist: jest.fn(),
        refreshProjectHandoverAttachmentChecklist: jest.fn(),
        createProjectHandoverAttachmentDownloadPackage: jest.fn(),
        getAttachmentDownloadPackage: jest.fn(),
        openAttachmentDownloadPackage: jest.fn()
    };
    type Binding = {
        handler: keyof AttachmentHandoverController;
        service: keyof typeof service;
        method: 'get' | 'post';
        path: string;
        id: string;
        permission: PermissionKey;
        requestId: boolean;
        body?: Record<string, unknown>;
    };
    const bindings: Binding[] = [
        {
            handler: 'getChecklist', service: 'getProjectHandoverAttachmentChecklist', method: 'get',
            path: '/api/project-handovers/{id}/attachment-checklist', id: '82000000-0000-4000-8000-000000000001',
            permission: 'project:read', requestId: true
        },
        {
            handler: 'refreshChecklist', service: 'refreshProjectHandoverAttachmentChecklist', method: 'post',
            path: '/api/project-handovers/{id}/attachment-checklist:refresh', id: '82000000-0000-4000-8000-000000000002',
            permission: 'project:write', requestId: true,
            body: { preserveManualExclusions: true, includeHistoricalSelections: true }
        },
        {
            handler: 'createDownloadPackage', service: 'createProjectHandoverAttachmentDownloadPackage', method: 'post',
            path: '/api/project-handovers/{id}/attachment-download-packages', id: '82000000-0000-4000-8000-000000000003',
            permission: 'project:read', requestId: true, body: { confirmedSensitiveExclusion: true }
        },
        {
            handler: 'getDownloadPackage', service: 'getAttachmentDownloadPackage', method: 'get',
            path: '/api/attachment-download-packages/{id}', id: '82000000-0000-4000-8000-000000000004',
            permission: 'project:read', requestId: false
        },
        {
            handler: 'downloadPackage', service: 'openAttachmentDownloadPackage', method: 'get',
            path: '/api/attachment-download-packages/{id}/download', id: '82000000-0000-4000-8000-000000000005',
            permission: 'project:read', requestId: true
        }
    ];
    let app: INestApplication;
    let origin: string;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [AttachmentHandoverController],
            providers: [{ provide: AttachmentService, useValue: service }]
        }).compile();
        app = moduleRef.createNestApplication();
        app.setGlobalPrefix('api');
        app.use((request: { user?: UserPayload }, _response: unknown, next: () => void) => {
            request.user = principal;
            next();
        });
        await app.init();
        await app.listen(0, '127.0.0.1');
        const address = (app.getHttpServer() as Server).address();
        if (!address || typeof address === 'string') throw new Error('Expected isolated loopback listener');
        origin = `http://127.0.0.1:${address.port}`;
    });

    afterAll(async () => {
        await app?.close();
    });

    beforeEach(() => {
        jest.resetAllMocks();
    });

    it.each(bindings)('forwards the concrete id through $handler', async (binding) => {
        const requestId = `binding-${binding.handler}`;
        const marker = 'Route binding only; no business row or package';
        service[binding.service].mockRejectedValueOnce(new NotFoundException(marker));
        const response = await fetch(origin + binding.path.replace('{id}', binding.id), {
            method: binding.method.toUpperCase(),
            headers: { 'x-request-id': requestId, ...(binding.body ? { 'content-type': 'application/json' } : {}) },
            ...(binding.body ? { body: JSON.stringify(binding.body) } : {})
        });
        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ statusCode: 404, message: marker, error: 'Not Found' });
        expect(service[binding.service]).toHaveBeenCalledTimes(1);
        const args: unknown[] = [binding.id];
        if (binding.body) args.push(binding.body);
        args.push(principal);
        if (binding.requestId) args.push(requestId);
        expect(service[binding.service]).toHaveBeenCalledWith(...args);
        for (const [name, spy] of Object.entries(service)) if (name !== binding.service) expect(spy).not.toHaveBeenCalled();
    });

    it('keeps exactly five operation IDs and binds only the id path argument', () => {
        const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Binding only').setVersion('test').build());
        expect(Object.keys(document.paths).sort()).toEqual(bindings.map((binding) => binding.path).sort());
        for (const binding of bindings) {
            const operation = document.paths[binding.path]?.[binding.method];
            expect(operation?.operationId).toBe(`AttachmentHandoverController_${binding.handler}`);
            // tsconfig.spec does not emit design:paramtypes, unlike the actual
            // OpenAPI exporter using tsconfig.app. Check the real @Param key
            // here; the full exported parameter schema is checked separately.
            const argumentsMetadata: Record<string, { index: number; data?: string; pipes: unknown[] }> =
                Reflect.getMetadata(ROUTE_ARGS_METADATA, AttachmentHandoverController, binding.handler) ?? {};
            const pathArguments = Object.entries(argumentsMetadata).filter(([key]) => Number(key.split(':')[0]) === RouteParamtypes.PARAM);
            expect(pathArguments).toHaveLength(1);
            expect(pathArguments[0]?.[1]).toEqual({ index: 0, data: 'id', pipes: [] });
        }
    });

    it('retains permission declarations, explicit POST status and download cache header', () => {
        for (const binding of bindings) {
            const handler = AttachmentHandoverController.prototype[binding.handler];
            expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual([binding.permission]);
            if (binding.method === 'post') expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(200);
        }
        expect(Reflect.getMetadata(HEADERS_METADATA, AttachmentHandoverController.prototype.downloadPackage)).toEqual([
            { name: 'Cache-Control', value: 'private, no-store' }
        ]);
    });
});
