import { NotFoundException, type INestApplication } from '@nestjs/common';
import { HTTP_CODE_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import type { UserPayload } from '@poms/shared-contracts';
import type { Server } from 'node:http';
import { PERMISSIONS_KEY } from '../../core/auth/decorators/has-permissions.decorator';
import { ProjectHandoverCommandService } from './project-handover-command.service';
import { ProjectHandoverController } from './project-handover.controller';
import { ProjectHandoverQueryService } from './project-handover-query.service';

describe('ProjectHandoverController', () => {
    const projectId = '20000000-0000-4000-8000-000000000001';
    const handoverId = '70000000-0000-4000-8000-000000000001';
    const actorUserId = '00000000-0000-4000-8000-000000000099';
    const contractSummarySnapshotId = '60000000-0000-4000-8000-000000000001';
    const amendmentId = '31000000-0000-4000-8000-000000000001';
    const effectiveBaselineAfterId = '50000000-0000-4000-8000-000000000202';

    let controller: ProjectHandoverController;
    let queryService: {
        getContractHandoverSummary: jest.Mock;
        getProjectHandoverDetailByProjectId: jest.Mock;
        getProjectHandoverDetailByHandoverId: jest.Mock;
    };
    let commandService: {
        confirmProjectHandover: jest.Mock;
        rebaselineContractHandover: jest.Mock;
    };
    const viewerRequest = {
        user: { sub: actorUserId, username: 'viewer', permissions: ['project:read'] },
        originalUrl: '/projects/20000000-0000-4000-8000-000000000001/contract-handover',
        method: 'GET'
    };

    beforeEach(() => {
        queryService = {
            getContractHandoverSummary: jest.fn(),
            getProjectHandoverDetailByProjectId: jest.fn(),
            getProjectHandoverDetailByHandoverId: jest.fn()
        };
        commandService = {
            confirmProjectHandover: jest.fn(),
            rebaselineContractHandover: jest.fn()
        };
        controller = new ProjectHandoverController(queryService as never, commandService as never);
    });

    it('delegates contract handover summary queries by project id', async () => {
        const summary = { projectId, allowedActions: ['confirm-project-handover'] };
        queryService.getContractHandoverSummary.mockResolvedValue(summary);

        await expect(controller.getContractHandoverSummary(projectId, viewerRequest as never)).resolves.toBe(summary);
        expect(queryService.getContractHandoverSummary).toHaveBeenCalledWith(
            projectId,
            viewerRequest.user,
            expect.objectContaining({ path: viewerRequest.originalUrl })
        );
    });

    it('delegates latest project handover detail queries by project id', async () => {
        const detail = { handoverId, projectId, handoverStatus: 'draft' };
        queryService.getProjectHandoverDetailByProjectId.mockResolvedValue(detail);

        await expect(controller.getProjectHandoverDetailByProject(projectId, viewerRequest as never)).resolves.toBe(detail);
        expect(queryService.getProjectHandoverDetailByProjectId).toHaveBeenCalledWith(
            projectId,
            viewerRequest.user,
            expect.objectContaining({ path: viewerRequest.originalUrl })
        );
    });

    it('delegates project handover detail queries by handover id', async () => {
        const detail = { handoverId, projectId, handoverStatus: 'draft' };
        queryService.getProjectHandoverDetailByHandoverId.mockResolvedValue(detail);

        await expect(controller.getProjectHandoverDetailByHandover(handoverId, viewerRequest as never)).resolves.toBe(detail);
        expect(queryService.getProjectHandoverDetailByHandoverId).toHaveBeenCalledWith(
            handoverId,
            viewerRequest.user,
            expect.objectContaining({ path: viewerRequest.originalUrl })
        );
    });

    it('passes actor id and request body to confirmProjectHandover', async () => {
        const body = {
            comment: '确认移交',
            participantConfirmations: [
                {
                    participantId: actorUserId,
                    participantRoleKey: 'execution-owner',
                    participantStatus: 'confirmed'
                }
            ],
            receiptJudgmentMode: 'milestone-receipt',
            contractSummarySnapshotId,
            expectedVersion: 1
        };
        const result = {
            targetId: handoverId,
            businessStatusAfter: 'confirmed',
            receiptJudgmentFreezeId: '73000000-0000-4000-8000-000000000001'
        };
        commandService.confirmProjectHandover.mockResolvedValue(result);

        await expect(
            controller.confirmProjectHandover(handoverId, { user: { sub: actorUserId } } as never, body as never)
        ).resolves.toBe(result);
        expect(commandService.confirmProjectHandover).toHaveBeenCalledWith(handoverId, actorUserId, body);
    });

    it('passes actor id and body to rebaselineContractHandover', async () => {
        const body = {
            contractAmendmentId: amendmentId,
            rebaselineReason: '合同变更影响移交基线',
            affectedHandoverItemIds: ['71000000-0000-4000-8000-000000000001'],
            effectiveBaselineAfterId,
            expectedVersion: 2
        };
        const result = {
            targetId: '72000000-0000-4000-8000-000000000001',
            rebaselineRecordId: '72000000-0000-4000-8000-000000000001',
            effectiveBaselineAfterId,
            resultStatus: 'effective'
        };
        commandService.rebaselineContractHandover.mockResolvedValue(result);

        await expect(
            controller.rebaselineContractHandover({ user: { sub: actorUserId } } as never, body as never)
        ).resolves.toBe(result);
        expect(commandService.rebaselineContractHandover).toHaveBeenCalledWith(actorUserId, body);
    });
});

// Exercise real Nest routing and Param binding with throw-only services. These
// tests do not certify authentication, prepared-state facts or R4 business writes.
describe('ProjectHandoverController canonical parameter binding', () => {
    const handoverId = '83000000-0000-4000-8000-000000000001';
    const principal: UserPayload = {
        sub: '83000000-0000-4000-8000-000000000099',
        username: 'route-binding-only',
        permissions: ['project:read', 'project:write']
    };
    const queryService = {
        getContractHandoverSummary: jest.fn(),
        getProjectHandoverDetailByProjectId: jest.fn(),
        getProjectHandoverDetailByHandoverId: jest.fn()
    };
    const commandService = {
        confirmProjectHandover: jest.fn(),
        rebaselineContractHandover: jest.fn()
    };
    let app: INestApplication;
    let origin: string;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [ProjectHandoverController],
            providers: [
                { provide: ProjectHandoverQueryService, useValue: queryService },
                { provide: ProjectHandoverCommandService, useValue: commandService }
            ]
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

    it('forwards the concrete id and unchanged projection context through the detail URL', async () => {
        const marker = 'R4 route binding only; no handover row';
        queryService.getProjectHandoverDetailByHandoverId.mockRejectedValueOnce(new NotFoundException(marker));
        const path = `/api/project-handovers/${handoverId}`;
        const response = await fetch(origin + path, { headers: { 'x-request-id': 'binding-r4-detail' } });

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ statusCode: 404, message: marker, error: 'Not Found' });
        expect(queryService.getProjectHandoverDetailByHandoverId).toHaveBeenCalledTimes(1);
        expect(queryService.getProjectHandoverDetailByHandoverId).toHaveBeenCalledWith(
            handoverId,
            principal,
            expect.objectContaining({ path, method: 'GET', requestId: 'binding-r4-detail' })
        );
        expect(queryService.getContractHandoverSummary).not.toHaveBeenCalled();
        expect(queryService.getProjectHandoverDetailByProjectId).not.toHaveBeenCalled();
        expect(commandService.confirmProjectHandover).not.toHaveBeenCalled();
        expect(commandService.rebaselineContractHandover).not.toHaveBeenCalled();
    });

    it('forwards the id, actor and unchanged business body through the literal confirm URL', async () => {
        const marker = 'R4 route binding only; no confirmation write';
        commandService.confirmProjectHandover.mockRejectedValueOnce(new NotFoundException(marker));
        const body = {
            comment: '绑定检查',
            participantConfirmations: [{ participantId: principal.sub, participantRoleKey: 'execution-owner', participantStatus: 'confirmed' }],
            receiptJudgmentMode: 'milestone-receipt',
            contractSummarySnapshotId: '83000000-0000-4000-8000-000000000002',
            expectedVersion: 7
        };
        const response = await fetch(`${origin}/api/project-handovers/${handoverId}:confirm`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body)
        });

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ statusCode: 404, message: marker, error: 'Not Found' });
        expect(commandService.confirmProjectHandover).toHaveBeenCalledTimes(1);
        expect(commandService.confirmProjectHandover).toHaveBeenCalledWith(handoverId, principal.sub, body);
        expect(commandService.rebaselineContractHandover).not.toHaveBeenCalled();
        for (const spy of Object.values(queryService)) expect(spy).not.toHaveBeenCalled();
    });

    it('changes only the two parameter labels and retains all five original operation IDs', () => {
        const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Binding only').setVersion('test').build());
        const operations = [
            ['get', '/api/projects/{projectId}/contract-handover', 'getContractHandoverSummary'],
            ['get', '/api/projects/{projectId}/project-handover', 'getProjectHandoverDetailByProject'],
            ['get', '/api/project-handovers/{id}', 'getProjectHandoverDetailByHandover'],
            ['post', '/api/project-handovers/{id}:confirm', 'confirmProjectHandover'],
            ['post', '/api/contract-handover-rebaselines', 'rebaselineContractHandover']
        ] as const;
        expect(Object.keys(document.paths).sort()).toEqual(operations.map(([, path]) => path).sort());
        for (const [method, path, handler] of operations) {
            expect(document.paths[path]?.[method]?.operationId).toBe(`ProjectHandoverController_${handler}`);
        }
        for (const [handler, parameter] of [
            ['getProjectHandoverDetailByHandover', 'id'],
            ['confirmProjectHandover', 'id'],
            ['getContractHandoverSummary', 'projectId'],
            ['getProjectHandoverDetailByProject', 'projectId']
        ] as const) {
            // The original spec compiler has no design:paramtypes. Exercise real
            // Param metadata here; Root separately checks the full app OpenAPI.
            const metadata: Record<string, { index: number; data?: string; pipes: unknown[] }> =
                Reflect.getMetadata(ROUTE_ARGS_METADATA, ProjectHandoverController, handler) ?? {};
            const parameters = Object.entries(metadata).filter(([key]) => Number(key.split(':')[0]) === RouteParamtypes.PARAM);
            expect(parameters).toHaveLength(1);
            expect(parameters[0]?.[1]).toEqual({ index: 0, data: parameter, pipes: [] });
        }
    });

    it('retains both permission declarations and the explicit confirm status', () => {
        expect(Reflect.getMetadata(PERMISSIONS_KEY, ProjectHandoverController.prototype.getProjectHandoverDetailByHandover)).toEqual(['project:read']);
        expect(Reflect.getMetadata(PERMISSIONS_KEY, ProjectHandoverController.prototype.confirmProjectHandover)).toEqual(['project:write']);
        expect(Reflect.getMetadata(HTTP_CODE_METADATA, ProjectHandoverController.prototype.confirmProjectHandover)).toBe(200);
    });
});
