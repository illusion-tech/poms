import pathlib,hashlib,json,difflib
own=pathlib.Path(__file__).resolve().parent
root=pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
paths=['apps/poms-admin/src/app/features/project/project-list.ts','libs/admin/data-access/src/lib/project/project.store.ts','libs/admin/data-access/src/index.ts','apps/poms-api/src/app/core/rust-r4ghi-native-protocol.guard.ts']
inputs=[];changes={};endings={}
for rel in paths:
 raw=(root/rel).read_bytes();inputs.append({'file':rel,'rawBytesSha256':hashlib.sha256(raw).hexdigest()});changes[rel]=raw.decode('utf-8');endings[rel]='\r\n' if b'\r\n' in raw else '\n'
def change(rel,before,after):
 before=before.replace('\n',endings[rel]);after=after.replace('\n',endings[rel])
 assert changes[rel].count(before)==1,before[:90]
 changes[rel]=changes[rel].replace(before,after)
ui,store,index,guard=paths
change(ui,'AuthStore, CustomerStatus, CustomerStore, ProjectStage, ProjectStatus, ProjectStore,','AuthStore, CustomerStatus, CustomerStore, ProjectInitialOwnership, ProjectStage, ProjectStatus, ProjectStore,')
change(ui,'    projectName: string;\n}\n\nconst ALL_FILTER_VALUE', '    projectName: string;\n    initialOwnership: ProjectInitialOwnership | null;\n}\n\nconst ALL_FILTER_VALUE')
change(ui,"    projectName: ''\n};", "    projectName: '',\n    initialOwnership: ProjectInitialOwnership.Creator\n};")
change(ui,'<div adminToolbarStart class="flex items-center">','''<div adminToolbarStart class="flex items-center">
                        @if (canCreateProject()) {
                            <p-button label="创建评估项目" icon="pi pi-plus" class="mr-2" ariaLabel="创建评估项目" (onClick)="showCreateDialog()" />
                        }''')
change(ui,'<div class="flex flex-col gap-5">','''<div class="flex flex-col gap-5">
            @if (createdProjectId() && createdProjectNavigationError()) {
                <section class="rounded border p-3" aria-label="已创建项目的首次指派入口">
                    <app-workspace-feedback severity="info" summary="项目已创建" [detail]="createdProjectNavigationError()" />
                    <p-button label="继续首次指派" severity="secondary" (onClick)="openCreatedProject()" />
                </section>
            }''')
change(ui,'header="新建项目"','header="创建评估项目"')
change(ui,'<p class="text-sm leading-6 text-surface-600 dark:text-surface-300">项目会从立项评估开始。后续阶段由项目进展自然推进。</p>','''<p class="text-sm leading-6 text-surface-600 dark:text-surface-300">项目从立项评估开始。线索转入与后续阶段仍按现有准入规则办理。</p>
                    <div class="flex flex-col gap-2">
                        <label for="projectInitialOwnership" class="text-sm font-medium text-surface-900 dark:text-surface-0">初始承接方式</label>
                        <p-select inputId="projectInitialOwnership" [ngModel]="createForm().initialOwnership" (ngModelChange)="updateInitialOwnership($event)" [options]="initialOwnershipOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full rounded-md!" />
                        @if (createForm().initialOwnership === organizationOwnership) {
                            <p class="text-sm text-surface-600 dark:text-surface-300">创建后由你先指派项目主责人，再继续项目办理。</p>
                        }
                    </div>''')
change(ui,"    readonly createError = signal<string | null>(null);", """    readonly createError = signal<string | null>(null);
    readonly createdProjectId = signal<string | null>(null);
    readonly createdProjectNavigationError = signal('');
    readonly organizationOwnership = ProjectInitialOwnership.Organization;
    readonly initialOwnershipOptions: Array<ProjectFilterOption<ProjectInitialOwnership>> = [
        { label: '创建人主责', value: ProjectInitialOwnership.Creator },
        { label: '组织承接，待创建人首次指派', value: ProjectInitialOwnership.Organization }
    ];""")
change(ui,'return Boolean(form.projectName.trim() && form.customerId);', 'return Boolean(form.projectName.trim() && form.customerId && (form.initialOwnership === ProjectInitialOwnership.Creator || form.initialOwnership === ProjectInitialOwnership.Organization));')
change(ui,'    updateCreateField(field: keyof CreateProjectForm, value: string) {', "    updateCreateField(field: 'customerProjectNo' | 'projectName', value: string) {")
change(ui,'    updateCreateCustomer(value: string | null | undefined) {', """    updateInitialOwnership(value: unknown) {
        if (value !== ProjectInitialOwnership.Creator && value !== ProjectInitialOwnership.Organization) {
            this.createForm.update((form) => ({ ...form, initialOwnership: null }));
            this.createError.set('请选择实际初始承接方式。');
            return;
        }
        this.createForm.update((form) => ({ ...form, initialOwnership: value }));
        this.createError.set(null);
    }

    async openCreatedProject() {
        const id = this.createdProjectId();
        if (!id) return;
        try {
            if (await this.#router.navigate(['/projects', id])) this.createdProjectNavigationError.set('');
            else this.createdProjectNavigationError.set('请打开首次指派继续办理，无需再次创建项目。');
        } catch { this.createdProjectNavigationError.set('请打开首次指派继续办理，无需再次创建项目。'); }
    }

    updateCreateCustomer(value: string | null | undefined) {""")
change(ui,"""            await this.#projectStore.createProject({
                projectName: form.projectName.trim(),
                customerId,
                customerProjectNo: this.optionalText(form.customerProjectNo)
            });
            this.closeCreateDialog();""", """            const project = await this.#projectStore.createProject({
                projectName: form.projectName.trim(),
                customerId,
                customerProjectNo: this.optionalText(form.customerProjectNo),
                ...(form.initialOwnership === ProjectInitialOwnership.Organization ? { initialOwnership: ProjectInitialOwnership.Organization } : {})
            });
            this.closeCreateDialog();
            if (form.initialOwnership === ProjectInitialOwnership.Organization) {
                this.createdProjectId.set(project.id);
                await this.openCreatedProject();
            }""")
change(store,'import { ProjectApi, ProjectStatus }', 'import { ProjectApi, ProjectInitialOwnership, ProjectStatus }')
change(store,"""            const project = await firstValueFrom(this.#projectApi.projectControllerCreate({ createProjectRequest: request }));
            if (this.#loaded()) {
                await this.loadProjects();
            }
            return project;""", """            const project = await firstValueFrom(this.#projectApi.projectControllerCreate({ createProjectRequest: request }));
            if (request.initialOwnership === ProjectInitialOwnership.Organization) {
                // The creator-only anchor is selected by its own route. No list/full/finance fan-out here.
                this.#loaded.set(false);
            } else if (this.#loaded()) {
                await this.loadProjects();
            }
            return project;""")
change(index,"export { ContractFinanceApi, CreateProjectArchiveRecordRequestInputVersionEnum,", "export { ProjectInitialOwnership, ContractFinanceApi, CreateProjectArchiveRecordRequestInputVersionEnum,")
change(guard,'@Injectable()\nexport class RustR4GhiNativeProtocolGuard', """export function rejectUnsupportedInitialProjectOwnership(body: unknown): void {
    if (record(body) && Object.prototype.hasOwnProperty.call(body, 'initialOwnership') && body['initialOwnership'] !== 'creator') {
        nativeR4GhiUnsupported('organization-owned or unsupported initial project responsibility');
    }
}

@Injectable()
export class RustR4GhiNativeProtocolGuard""")
change(guard,'        const body = request.body;','''        const body = request.body;
        if (context.getClass().name === 'ProjectController' && context.getHandler().name === 'create') rejectUnsupportedInitialProjectOwnership(body);''')
patch=''
for rel in paths:
 out=own/'proposed'/rel;out.parent.mkdir(parents=True,exist_ok=True);assert not out.exists();out.write_bytes(changes[rel].encode('utf-8'))
 patch+=''.join(difflib.unified_diff((root/rel).read_text().splitlines(True),changes[rel].replace('\r\n','\n').splitlines(True),fromfile='a/'+rel,tofile='b/'+rel))
(own/'create12.patch').write_text(patch,encoding='utf-8',newline='')
(own/'inputs12.json').write_text(json.dumps({'schemaVersion':1,'root':str(root),'files':inputs,'SDKEnumRequired':'ProjectInitialOwnership','SDKNotYetRegenerated':True},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'candidateFiles':len(paths),'sourceBases':inputs,'SDKIntegrationClaim':False}))
