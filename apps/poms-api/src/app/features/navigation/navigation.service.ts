import type { NavigationItem, PermissionKey } from '@poms/shared-contracts';
import { Injectable } from '@nestjs/common';
import { NAVIGATION_TREE } from './navigation.constants';

@Injectable()
export class NavigationService {
    getNavigationForUser(userPermissions: PermissionKey[]): NavigationItem[] {
        return this.#filterTree(NAVIGATION_TREE, userPermissions);
    }

    getAllNavigationItems(): NavigationItem[] {
        return NAVIGATION_TREE;
    }

    #filterTree(items: NavigationItem[], userPermissions: PermissionKey[]): NavigationItem[] {
        const result: NavigationItem[] = [];

        for (const item of items) {
            if (item.isHidden) continue;

            const canSee = item.requiredPermissions === null || item.requiredPermissions.every((p) => userPermissions.includes(p));

            if (!canSee) continue;

            const filteredItem: NavigationItem = { ...item };

            if (item.children && item.children.length > 0) {
                const visibleChildren = this.#filterTree(item.children, userPermissions);
                // 对 group 类型：如果子项全被过滤掉，则隐藏该组
                if (item.type === 'group' && visibleChildren.length === 0) continue;
                filteredItem.children = visibleChildren.length > 0 ? visibleChildren : null;
            }

            result.push(filteredItem);
        }

        return result.sort((a, b) => a.displayOrder - b.displayOrder);
    }
}
