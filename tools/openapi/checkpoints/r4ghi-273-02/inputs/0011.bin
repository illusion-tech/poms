import { SetMetadata } from '@nestjs/common';

export const IS_AUTHENTICATED_KEY = 'isAuthenticated';

/**
 * 显式标记"此路由只需登录即可访问"，不要求特定权限。
 * 与 @HasPermissions() 互斥，二选一即可。
 */
export const Authenticated = () => SetMetadata(IS_AUTHENTICATED_KEY, true);
