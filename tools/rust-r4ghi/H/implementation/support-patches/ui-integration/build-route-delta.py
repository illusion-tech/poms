from pathlib import Path
root=Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
here=Path(__file__).resolve().parent
rel=Path('apps/poms-admin/src/app.routes.ts')
s=(root/rel).read_text(encoding='utf8')
anchor="            {\n                path: 'projects/:id/workspace',"
assert s.count(anchor)==1
routes='''            {
                path: 'projects/:id/condition-tasks',
                loadComponent: () => import('./app/features/project/project-own-condition-tasks').then((c) => c.ProjectOwnConditionTasks),
                canActivate: [permissionGuard],
                data: { breadcrumb: '本人的完成条件', requiredPermissions: ['project:read'], requiredPermissionsMode: 'all' }
            },
            {
                path: 'projects/:id/governance',
                loadComponent: () => import('./app/features/project/project-governance').then((c) => c.ProjectGovernance),
                canActivate: [permissionGuard],
                data: { breadcrumb: '经营与交付办理', requiredPermissions: ['project:read'], requiredPermissionsMode: 'all' }
            },
'''
s=s.replace(anchor,routes+anchor)
old="loadComponent: () => import('./app/features/project/project-detail').then((c) => c.ProjectDetail),"
assert s.count(old)==1
s=s.replace(old,"loadComponent: () => import('./app/features/project/project-detail-scope-entry').then((c) => c.ProjectDetailScopeEntry),")
target=here/'proposed'/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(s,encoding='utf8',newline='\n')
