import type { PermissionKey } from '@poms/shared-contracts';
import { SetMetadata } from '@nestjs/common';

export const ANY_PERMISSIONS_KEY = 'anyPermissions';

export const HasAnyPermissions = (...permissions: PermissionKey[]) => SetMetadata(ANY_PERMISSIONS_KEY, permissions);
