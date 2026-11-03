import {
    SENSITIVE_FIELD_PACKAGE_REQUIRED_PERMISSIONS,
    type PermissionKey,
    type SensitiveFieldPackageKey
} from '@poms/shared-contracts';

export function requiredPermissionForSensitiveFieldPackage(fieldPackageKey: SensitiveFieldPackageKey): PermissionKey {
    return SENSITIVE_FIELD_PACKAGE_REQUIRED_PERMISSIONS[fieldPackageKey];
}

export function canReadFullSensitiveFieldPackage(userPermissions: readonly PermissionKey[], fieldPackageKey: SensitiveFieldPackageKey): boolean {
    return userPermissions.includes(requiredPermissionForSensitiveFieldPackage(fieldPackageKey));
}
