import type { NavigationItem } from '@poms/shared-contracts';

/**
 * 专用于测试 isHidden / isDisabled 可见性规则。
 * 使用独立文件 + jest.mock 提供受控树，避免污染依赖真实 NAVIGATION_TREE 的基础单测。
 */

const base: Omit<NavigationItem, 'key' | 'id'> = {
    type: 'basic',
    title: '节点',
    subtitle: null,
    link: '/link',
    icon: null,
    displayOrder: 0,
    isHidden: false,
    isDisabled: false,
    requiredPermissions: null,
    meta: null,
    children: null
};

jest.mock('./navigation.constants', () => ({
    NAVIGATION_TREE: [
        { ...base, id: 'nav-visible', key: 'visible-item' },
        { ...base, id: 'nav-hidden', key: 'hidden-item', isHidden: true },
        { ...base, id: 'nav-disabled', key: 'disabled-item', isDisabled: true },
        {
            ...base,
            id: 'nav-group-hidden-children',
            key: 'group-all-hidden',
            type: 'group',
            children: [
                { ...base, id: 'nav-child-hidden', key: 'child-hidden', isHidden: true }
            ]
        }
    ] satisfies NavigationItem[]
}));

import { NavigationService } from './navigation.service';

describe('NavigationService – visibility rules (isHidden / isDisabled)', () => {
    let service: NavigationService;

    beforeEach(() => {
        service = new NavigationService();
    });

    it('does not return items with isHidden=true', () => {
        const result = service.getNavigationForUser([]);
        const keys = result.map((item) => item.key);
        expect(keys).not.toContain('hidden-item');
    });

    it('still returns other visible items when a sibling has isHidden=true', () => {
        const result = service.getNavigationForUser([]);
        const keys = result.map((item) => item.key);
        expect(keys).toContain('visible-item');
    });

    it('returns items with isDisabled=true and preserves the disabled flag', () => {
        const result = service.getNavigationForUser([]);
        const disabled = result.find((item) => item.key === 'disabled-item');
        expect(disabled).toBeDefined();
        expect(disabled?.isDisabled).toBe(true);
    });

    it('hides a group node when all its children have isHidden=true', () => {
        const result = service.getNavigationForUser([]);
        const keys = result.map((item) => item.key);
        expect(keys).not.toContain('group-all-hidden');
    });
});
