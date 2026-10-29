import { NotFoundException, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { ContractLookupQueryDto, ProjectLookupQueryDto } from '@poms/api-contracts';
import type { UserPayload } from '@poms/shared-contracts';
import { ZodValidationException, ZodValidationPipe } from '@poms/vendor-nestjs-zod';
import type { Server } from 'node:http';
import { parse } from 'node:querystring';
import { PERMISSIONS_KEY } from '../../core/auth/decorators/has-permissions.decorator';
import { SensitiveFieldProjectionService } from '../../core/sensitive-field-projection/sensitive-field-projection.service';
import { ApprovalService } from '../approval/approval.service';
import { ContractController, ContractLookupController } from '../contract/contract.controller';
import { ContractTermSnapshotRepository } from '../contract/contract.repository';
import { ContractService } from '../contract/contract.service';
import { ProjectController, ProjectLookupController } from './project.controller';
import { ProjectQueryService } from './project-query.service';
import { ProjectService } from './project.service';

// Real Nest routing with throw-only services, plus direct production DTO/pipe
// checks. The default spec compiler omits design:paramtypes, so HTTP validation,
// authentication and database/audit persistence require the separate Native run.
describe('Business-number lookup canonical route binding', () => {
    const projectService = { findByNo: jest.fn() };
    const contractService = { findByNo: jest.fn(), findById: jest.fn() };
    const projectQueryService = { getProjectDetail: jest.fn() };
    const principal: UserPayload = {
        sub: '84000000-0000-4000-8000-000000000001', username: 'lookup-binding-only', permissions: ['project:read']
    };
    const marker = 'Lookup binding only; no business row';
    const bindings = [
        { path: '/api/projects:lookup', key: 'projectNo', operationId: 'ProjectController_getByCode', service: projectService, controller: ProjectLookupController, handler: 'getByCode' },
        { path: '/api/contracts:lookup', key: 'contractNo', operationId: 'ContractController_getByNo', service: contractService, controller: ContractLookupController, handler: 'getByNo' }
    ] as const;
    let app: INestApplication;
    let origin: string;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [ProjectController, ProjectLookupController, ContractController, ContractLookupController],
            providers: [
                { provide: ProjectService, useValue: projectService },
                { provide: ProjectQueryService, useValue: projectQueryService },
                { provide: ContractService, useValue: contractService },
                { provide: ApprovalService, useValue: {} },
                { provide: ContractTermSnapshotRepository, useValue: {} },
                { provide: SensitiveFieldProjectionService, useValue: {} }
            ]
        }).compile();
        app = moduleRef.createNestApplication();
        app.setGlobalPrefix('api');
        app.use((request: { user?: UserPayload }, _response: unknown, next: () => void) => {
            request.user = principal;
            next();
        });
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
        projectService.findByNo.mockRejectedValue(new NotFoundException(marker));
        contractService.findByNo.mockRejectedValue(new NotFoundException(marker));
        projectQueryService.getProjectDetail.mockRejectedValue(new NotFoundException('UUID item binding only'));
        contractService.findById.mockRejectedValue(new NotFoundException('UUID item binding only'));
    });

    it.each(bindings)('forwards exact decoded query scalars through $path', async (binding) => {
        for (const value of ['PRJ-2026-001', ' value ', '项目/é:e\u0301+ß', 'X'.repeat(65)]) {
            binding.service.findByNo.mockClear();
            const response = await fetch(`${origin}${binding.path}?${binding.key}=${encodeURIComponent(value)}&extra=ignored`);
            expect(response.status).toBe(404);
            expect(await response.json()).toEqual({ statusCode: 404, message: marker, error: 'Not Found' });
            expect(binding.service.findByNo).toHaveBeenCalledTimes(1);
            expect(binding.service.findByNo).toHaveBeenCalledWith(value);
        }
    });

    it.each(bindings)('uses the simple query parser for plus, escapes and scalar-plus-bracket on $path', async (binding) => {
        const response = await fetch(`${origin}${binding.path}?${binding.key}=+A%2B%2F%3A%26%3D%25&${binding.key}[]=ignored`);

        expect(response.status).toBe(404);
        expect(binding.service.findByNo).toHaveBeenCalledWith(' A+/:&=%');
    });

    it.each(['/api/projects/code/PRJ-2026-001', '/api/contracts/no/CT-2026-001'])('does not expose the removed lookup route %s', async (oldPath) => {
        const response = await fetch(origin + oldPath);

        expect(response.status).toBe(404);
        expect(projectService.findByNo).not.toHaveBeenCalled();
        expect(contractService.findByNo).not.toHaveBeenCalled();
    });

    it.each(['/api/projects/lookup?projectNo=A', '/api/contracts/lookup?contractNo=A', '/api/projects:lookupExtra?projectNo=A', '/api/contracts:lookupExtra?contractNo=A'])('does not interpret %s as the literal-colon lookup', async (url) => {
        const response = await fetch(origin + url);

        expect(response.status).toBe(404);
        expect(projectService.findByNo).not.toHaveBeenCalled();
        expect(contractService.findByNo).not.toHaveBeenCalled();
    });

    it('keeps the two original operation IDs exactly once with their permission metadata', () => {
        const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Lookup binding only').setVersion('test').build());
        const operationIds = Object.values(document.paths).flatMap((item) => Object.values(item ?? {}).map((operation) => operation?.operationId));
        for (const binding of bindings) {
            expect(document.paths[binding.path]?.get?.operationId).toBe(binding.operationId);
            expect(operationIds.filter((id) => id === binding.operationId)).toHaveLength(1);
            const handler = binding.controller.prototype[binding.handler as keyof typeof binding.controller.prototype];
            expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual(['project:read']);
        }
        expect(document.paths['/api/projects/code/{projectNo}']).toBeUndefined();
        expect(document.paths['/api/contracts/no/{contractNo}']).toBeUndefined();
    });
});

describe.each([
    { key: 'projectNo', dto: ProjectLookupQueryDto },
    { key: 'contractNo', dto: ContractLookupQueryDto }
])('Business-number lookup query DTO/pipe: $key', ({ key, dto }) => {
    const pipe = new ZodValidationPipe();
    const transform = (value: unknown) => pipe.transform(value, { type: 'query', metatype: dto });

    it.each([undefined, '', null, 123, ['A'], ['A', 'A'], { value: 'A' }])('rejects a missing, empty or non-scalar field: %p', (value) => {
        expect(() => transform({ [key]: value })).toThrow(ZodValidationException);
    });

    it('rejects missing fields and repeated target keys without selecting first or last', () => {
        expect(() => transform({})).toThrow(ZodValidationException);
        expect(() => transform(parse(`${key}=A&${key}=A`))).toThrow(ZodValidationException);
        expect(() => transform(parse(`${key}=A&${key}=B`))).toThrow(ZodValidationException);
        expect(() => transform(parse(`${key}[]=A`))).toThrow(ZodValidationException);
        expect(() => transform(parse(`${key}[value]=A`))).toThrow(ZodValidationException);
    });

    it('preserves all string content and strips unknown keys without imposing UUID or column-length validation', () => {
        for (const value of [' ', ' value ', '项目/é:e\u0301+ß', 'null', '123', 'X'.repeat(65)]) {
            expect(transform({ [key]: value, extra: 'ignored' })).toEqual({ [key]: value });
        }
        expect(transform(parse(`${key}=A&${key}[]=B&other=value`))).toEqual({ [key]: 'A' });
    });
});
