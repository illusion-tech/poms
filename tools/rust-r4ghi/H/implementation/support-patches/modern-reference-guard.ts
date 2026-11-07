// Root-owned target suggestion: apps/poms-api/src/app/compat/rust-r4ghi-modern-reference.guard.ts
// Apply as a method guard AFTER each existing session/permission/CSRF guard,
// before Zod pipes, for only the frozen modern write DTO operations plus the
// existing ConfirmReceiptRecord basis protocol. No legacy success-code change.
import { CanActivate, ExecutionContext, Injectable, UnprocessableEntityException } from '@nestjs/common';

@Injectable()
export class RustR4GhiModernReferenceGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<{ body?: unknown }>();
        const body = request.body;
        if (typeof body === 'object' && body !== null && 'inputVersion' in body && body.inputVersion === 'server-derived-v1') {
            throw new UnprocessableEntityException({
                statusCode: 422,
                error: 'Unprocessable Entity',
                code: 'modern_operating_protocol_unsupported_by_native_reference',
                message: 'This frozen Native reference supports only its original request protocol; server-derived-v1 is implemented by Rust.'
            });
        }
        return true;
    }
}
