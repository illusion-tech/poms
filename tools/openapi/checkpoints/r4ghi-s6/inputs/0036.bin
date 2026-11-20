// Root-owned proposal. Method guards run after existing global session/CSRF/
// permission guards and before all Zod pipes. No old producer is called here.
import { CanActivate, ExecutionContext, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { z } from 'zod';

function record(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function stageLedgerEvidence(value: unknown): boolean {
    return record(value) && value['kind'] === 'source' && typeof value['sourceType'] === 'string' && value['sourceType'].trim() === 'project-stage-record';
}
export function nativeR4GhiUnsupported(reason: string): never {
    throw new UnprocessableEntityException({ statusCode: 422, error: 'Unprocessable Entity', code: 'rust_r4ghi_protocol_unsupported_by_native_reference', message: `Frozen Native reference cannot execute ${reason}; use the Rust implementation.` });
}
export function parseR4GhiFrozenNativeValue<T>(schema: z.ZodType<T>, value: unknown): T {
    const parsed = schema.safeParse(value);
    if (!parsed.success) return nativeR4GhiUnsupported('a value outside its frozen legacy contract');
    return parsed.data;
}

export function rejectUnsupportedInitialProjectOwnership(body: unknown): void {
    if (record(body) && Object.prototype.hasOwnProperty.call(body, 'initialOwnership') && body['initialOwnership'] !== 'creator') {
        nativeR4GhiUnsupported('organization-owned or unsupported initial project responsibility');
    }
}

@Injectable()
export class RustR4GhiNativeProtocolGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<{ body?: unknown }>();
        if (['startExecution', 'startAcceptance', 'closeCompletionCondition'].includes(context.getHandler().name)) nativeR4GhiUnsupported('this new lifecycle command');
        const body = request.body;
        if (context.getClass().name === 'ProjectController' && context.getHandler().name === 'create') rejectUnsupportedInitialProjectOwnership(body);
        // The sealed legacy protocol has no inputVersion. Any explicitly
        // tagged envelope must never be reinterpreted as a legacy command.
        if (record(body) && Object.prototype.hasOwnProperty.call(body, 'inputVersion')) nativeR4GhiUnsupported('an explicitly tagged server-derived command');
        if (record(body) && (stageLedgerEvidence(body['attributionEvidence']) || (Array.isArray(body['sourceReferences']) && body['sourceReferences'].some(stageLedgerEvidence)))) nativeR4GhiUnsupported('project-stage-record source evidence');
        return true;
    }
}
