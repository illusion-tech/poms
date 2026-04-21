import { Routes } from '@angular/router';
import { authGuard } from './app/core/auth/auth.guard';
import { permissionGuard } from './app/core/auth/permission.guard';

export const appRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./app/layout/components/app.layout').then((c) => c.AppLayout),
        canActivate: [authGuard],
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                loadComponent: () => import('./app/features/dashboard/workbench').then((c) => c.Workbench),
                data: { breadcrumb: '工作台' }
            },
            {
                path: 'projects',
                loadComponent: () => import('./app/features/project/project-list').then((c) => c.ProjectList),
                canActivate: [permissionGuard],
                data: {
                    breadcrumb: '项目管理',
                    requiredPermissions: ['project:read'],
                    requiredPermissionsMode: 'all'
                }
            },
            {
                path: 'projects/:id/workspace',
                loadComponent: () => import('./app/features/project/project-workspace-shell').then((c) => c.ProjectWorkspaceShell),
                canActivate: [permissionGuard],
                data: {
                    breadcrumb: '项目工作区',
                    requiredPermissions: ['project:read'],
                    requiredPermissionsMode: 'all'
                },
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./app/features/project/project-workspace-home').then((c) => c.ProjectWorkspaceHome),
                        data: { breadcrumb: '工作区总览' }
                    },
                    {
                        path: 'operating-overview',
                        loadComponent: () => import('./app/features/project/project-operating-overview').then((c) => c.ProjectOperatingOverview),
                        canActivate: [permissionGuard],
                        data: {
                            breadcrumb: '经营总览',
                            requiredPermissions: ['project:read', 'contract:finance:manage'],
                            requiredPermissionsMode: 'all'
                        }
                    },
                    {
                        path: 'variance-risk',
                        loadComponent: () => import('./app/features/project/project-variance-risk').then((c) => c.ProjectVarianceRisk),
                        canActivate: [permissionGuard],
                        data: {
                            breadcrumb: '偏差与风险',
                            requiredPermissions: ['project:read', 'contract:finance:manage'],
                            requiredPermissionsMode: 'all'
                        }
                    }
                ]
            },
            {
                path: 'projects/:id/commission',
                loadComponent: () => import('./app/features/commission/project-commission-shell').then((c) => c.ProjectCommissionShell),
                canActivate: [permissionGuard],
                data: {
                    breadcrumb: '提成工作区',
                    requiredPermissions: ['project:read'],
                    requiredPermissionsMode: 'all'
                },
                children: [
                    {
                        path: '',
                        pathMatch: 'full',
                        redirectTo: 'gate-overview'
                    },
                    {
                        path: 'gate-overview',
                        loadComponent: () =>
                            import('./app/features/commission/project-commission-gate-overview').then((c) => c.ProjectCommissionGateOverview),
                        canActivate: [permissionGuard],
                        data: {
                            breadcrumb: '提成阶段解释',
                            requiredPermissions: ['project:read', 'contract:finance:manage'],
                            requiredPermissionsMode: 'all'
                        }
                    },
                    {
                        path: 'final-settlement',
                        loadComponent: () =>
                            import('./app/features/commission/project-commission-final-settlement').then((c) => c.ProjectCommissionFinalSettlement),
                        canActivate: [permissionGuard],
                        data: {
                            breadcrumb: '最终结算',
                            requiredPermissions: ['project:read', 'commission:payouts:manage'],
                            requiredPermissionsMode: 'all'
                        }
                    },
                    {
                        path: 'rule-explanation',
                        loadComponent: () =>
                            import('./app/features/commission/project-commission-rule-explanation').then((c) => c.ProjectCommissionRuleExplanation),
                        canActivate: [permissionGuard],
                        data: {
                            breadcrumb: '规则解释',
                            requiredPermissions: ['project:read', 'commission:payouts:manage'],
                            requiredPermissionsMode: 'all'
                        }
                    },
                    {
                        path: 'operations',
                        loadComponent: () => import('./app/features/commission/project-commission').then((c) => c.ProjectCommission),
                        canActivate: [permissionGuard],
                        data: {
                            breadcrumb: '提成操作',
                            requiredPermissions: [
                                'project:read',
                                'commission:rule-versions:manage',
                                'commission:calculations:manage',
                                'commission:payouts:manage',
                                'commission:adjustments:manage'
                            ],
                            requiredPermissionsMode: 'all'
                        }
                    }
                ]
            },
            {
                path: 'projects/:id',
                loadComponent: () => import('./app/features/project/project-detail').then((c) => c.ProjectDetail),
                canActivate: [permissionGuard],
                data: {
                    breadcrumb: '项目详情',
                    requiredPermissions: ['project:read'],
                    requiredPermissionsMode: 'all'
                }
            },
            {
                path: 'contracts',
                loadComponent: () => import('./app/features/contract/contract-list').then((c) => c.ContractList),
                canActivate: [permissionGuard],
                data: {
                    breadcrumb: '合同管理',
                    requiredPermissions: ['project:read'],
                    requiredPermissionsMode: 'all'
                }
            },
            {
                path: 'contracts/:id',
                loadComponent: () => import('./app/features/contract/contract-detail').then((c) => c.ContractDetail),
                canActivate: [permissionGuard],
                data: {
                    breadcrumb: '合同详情',
                    requiredPermissions: ['project:read'],
                    requiredPermissionsMode: 'all'
                }
            },
            {
                path: 'profile',
                loadComponent: () => import('./app/features/profile/current-user-profile').then((c) => c.CurrentUserProfile),
                data: { breadcrumb: '个人中心' }
            },
            {
                path: 'platform/users',
                loadComponent: () => import('./app/features/user-management/user-list').then((c) => c.UserList),
                canActivate: [permissionGuard],
                data: {
                    breadcrumb: '用户管理',
                    requiredPermissions: ['platform:users:manage']
                }
            },
            {
                path: 'platform/roles',
                loadComponent: () => import('./app/features/platform/role-list').then((c) => c.RoleList),
                canActivate: [permissionGuard],
                data: {
                    breadcrumb: '角色管理',
                    requiredPermissions: ['platform:roles:manage']
                }
            },
            {
                path: 'platform/org-units',
                loadComponent: () => import('./app/features/platform/org-unit-list').then((c) => c.OrgUnitList),
                canActivate: [permissionGuard],
                data: {
                    breadcrumb: '组织管理',
                    requiredPermissions: ['platform:org-units:manage']
                }
            },
            {
                path: 'platform/navigation',
                loadComponent: () => import('./app/features/platform/navigation-governance').then((c) => c.NavigationGovernance),
                canActivate: [permissionGuard],
                data: {
                    breadcrumb: '导航治理',
                    requiredPermissions: ['platform:navigation:manage']
                }
            }
        ]
    },
    {
        path: 'auth',
        loadComponent: () => import('./app/layout/components/app.authlayout').then((c) => c.AuthLayout),
        children: [
            {
                path: 'login',
                loadComponent: () => import('./app/features/auth/login').then((c) => c.Login)
            },
            {
                path: 'register',
                loadComponent: () => import('./app/features/auth/register').then((c) => c.Register)
            },
            {
                path: 'verification',
                loadComponent: () => import('./app/features/auth/verification').then((c) => c.Verification)
            },
            {
                path: 'forgot-password',
                loadComponent: () => import('./app/features/auth/forgotpassword').then((c) => c.ForgotPassword)
            },
            {
                path: 'new-password',
                loadComponent: () => import('./app/features/auth/newpassword').then((c) => c.NewPassword)
            },
            {
                path: 'lock-screen',
                loadComponent: () => import('./app/features/auth/lockscreen').then((c) => c.LockScreen)
            },
            {
                path: 'access',
                loadComponent: () => import('./app/features/auth/access').then((c) => c.Access)
            }
        ]
    },
    {
        path: 'notfound',
        loadComponent: () => import('./app/demo/misc/notfound/notfound').then((c) => c.Notfound)
    },
    { path: '**', redirectTo: '/notfound' }
];
