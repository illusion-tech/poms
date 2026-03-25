import type { NavigationItem } from '@poms/shared-contracts';

/**
 * 系统内置导航树（SSOT）。
 * requiredPermissions 为 null 表示仅需登录即可见。
 * requiredPermissions 数组中的权限按 AND 逻辑检查（全部满足才显示）。
 */
export const NAVIGATION_TREE: NavigationItem[] = [
    {
        id: 'nav-dashboard',
        key: 'dashboard',
        type: 'basic',
        title: '工作台',
        subtitle: null,
        link: '/dashboard',
        icon: 'pi pi-home',
        displayOrder: 0,
        isHidden: false,
        isDisabled: false,
        requiredPermissions: ['nav:dashboard:view'],
        meta: null,
        children: null
    },
    {
        id: 'nav-projects',
        key: 'projects',
        type: 'basic',
        title: '项目管理',
        subtitle: null,
        link: '/projects',
        icon: 'pi pi-briefcase',
        displayOrder: 100,
        isHidden: false,
        isDisabled: false,
        requiredPermissions: ['nav:projects:view'],
        meta: null,
        children: null
    },
    {
        id: 'nav-contracts',
        key: 'contracts',
        type: 'basic',
        title: '合同管理',
        subtitle: null,
        link: '/contracts',
        icon: 'pi pi-file-edit',
        displayOrder: 150,
        isHidden: false,
        isDisabled: false,
        requiredPermissions: ['nav:contracts:view'],
        meta: null,
        children: null
    },
    {
        id: 'nav-platform',
        key: 'platform',
        type: 'group',
        title: '平台配置',
        subtitle: null,
        link: null,
        icon: 'pi pi-cog',
        displayOrder: 200,
        isHidden: false,
        isDisabled: false,
        requiredPermissions: null,
        meta: null,
        children: [
            {
                id: 'nav-platform-users',
                key: 'platform.users',
                type: 'basic',
                title: '用户管理',
                subtitle: null,
                link: '/platform/users',
                icon: 'pi pi-users',
                displayOrder: 0,
                isHidden: false,
                isDisabled: false,
                requiredPermissions: ['platform:users:manage'],
                meta: null,
                children: null
            },
            {
                id: 'nav-platform-roles',
                key: 'platform.roles',
                type: 'basic',
                title: '角色与权限',
                subtitle: null,
                link: '/platform/roles',
                icon: 'pi pi-shield',
                displayOrder: 10,
                isHidden: false,
                isDisabled: false,
                requiredPermissions: ['platform:roles:manage'],
                meta: null,
                children: null
            },
            {
                id: 'nav-platform-org-units',
                key: 'platform.org-units',
                type: 'basic',
                title: '组织单元',
                subtitle: null,
                link: '/platform/org-units',
                icon: 'pi pi-sitemap',
                displayOrder: 20,
                isHidden: false,
                isDisabled: false,
                requiredPermissions: ['platform:org-units:manage'],
                meta: null,
                children: null
            },
            {
                id: 'nav-platform-navigation',
                key: 'platform.navigation',
                type: 'basic',
                title: '导航菜单',
                subtitle: null,
                link: '/platform/navigation',
                icon: 'pi pi-bars',
                displayOrder: 30,
                isHidden: false,
                isDisabled: false,
                requiredPermissions: ['platform:navigation:manage'],
                meta: null,
                children: null
            }
        ]
    },
    {
        id: 'nav-profile',
        key: 'my_profile',
        type: 'basic',
        title: '个人中心',
        subtitle: null,
        link: '/profile',
        icon: 'pi pi-user',
        displayOrder: 999,
        isHidden: false,
        isDisabled: false,
        requiredPermissions: ['nav:profile:view'],
        meta: null,
        children: null
    }
];
