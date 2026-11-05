// Root-only DTO/export wiring. New business operations are Rust-owned; Native stubs say so.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const ts = createRequire(import.meta.url)('typescript');
assert(JSON.parse(fs.readFileSync('docs/design/rust-r4def/g1-gate-authority07.json')).G2Authorized);
function imports(file, module, symbols) {
    let text = fs.readFileSync(file, 'utf8'); const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const imp = ast.statements.find(s => ts.isImportDeclaration(s) && s.moduleSpecifier.text === module && s.importClause?.namedBindings && ts.isNamedImports(s.importClause.namedBindings));
    if (imp) {
        const specs = imp.importClause.namedBindings.elements.map(s => s.getText(ast));
        const existing = new Set(imp.importClause.namedBindings.elements.map(s => s.name.text));
        for (const symbol of symbols) if (!existing.has(symbol)) specs.push(symbol);
        text = text.slice(0, imp.getStart(ast)) + `import ${imp.importClause.isTypeOnly ? 'type ' : ''}{ ${specs.join(', ')} } from ${JSON.stringify(module)};` + text.slice(imp.end);
    } else text = `import { ${symbols.join(', ')} } from ${JSON.stringify(module)};\n` + text;
    fs.writeFileSync(file, text);
}
const projectDto = 'libs/api/contracts/src/lib/project/project.dto.ts';
const costDto = 'libs/api/contracts/src/lib/project-cost/project-cost.dto.ts';
const newProject = ['PrepareProjectHandoverRequest', 'ConfirmProjectHandoverParticipantRequest'];
const newCost = ['ConfirmSharedCostAllocationBasisResult', 'ReplaceSharedCostAllocationResultResult', 'ConfirmCostStageAttributionResult', 'ReclassifyCostStageAttributionResult', 'ConfirmAccountingTaxTreatmentResult', 'ReplaceAccountingTaxTreatmentResult'];
for (const [file, names] of [[projectDto, newProject], [costDto, [...newCost, 'CommandResult']]]) {
    imports(file, '@poms/shared-contracts', names.map(n => n + 'Schema'));
    const classes = names.map(n => `export class ${n === 'CommandResult' ? 'ProjectCostCommandResult' : n}Dto extends createZodDto(${n}Schema) {}`).join('\n\n');
    fs.appendFileSync(file, '\n\n' + classes + '\n');
}
const controller = 'apps/poms-api/src/app/features/project-handover/project-handover.controller.ts';
imports(controller, '@nestjs/common', ['NotImplementedException']);
imports(controller, '@nestjs/swagger', ['ApiCreatedResponse']);
imports(controller, '@poms/api-contracts', newProject.map(n => n + 'Dto'));
let text = fs.readFileSync(controller, 'utf8');
let ast = ts.createSourceFile(controller, text, ts.ScriptTarget.Latest, true);
const cl = ast.statements.find(s => ts.isClassDeclaration(s) && s.name?.text === 'ProjectHandoverController'); assert(cl);
const methods = `
    // Rust owns these new commands. Native remains a labelled source-reference runtime.
    @Post('projects/:projectId/project-handovers')
    @HasPermissions('project:write')
    @ApiOperation({ summary: '准备真实项目移交与职责确认材料' })
    @ApiCreatedResponse({ type: ProjectHandoverDetailViewDto })
    prepareProjectHandover(@Param('projectId') projectId: string, @Body() body: PrepareProjectHandoverRequestDto): Promise<ProjectHandoverDetailView> {
        void projectId; void body;
        return Promise.reject(new NotImplementedException('Real handover preparation is implemented by the Rust backend'));
    }

    @Post('project-handovers/:id/participant-confirmations')
    @HasPermissions('project:read')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '当前参与人确认本人承担的移交职责' })
    @ApiOkResponse({ type: ProjectHandoverDetailViewDto })
    confirmProjectHandoverParticipant(@Param('id') id: string, @Body() body: ConfirmProjectHandoverParticipantRequestDto): Promise<ProjectHandoverDetailView> {
        void id; void body;
        return Promise.reject(new NotImplementedException('Real participant confirmation is implemented by the Rust backend'));
    }
`;
text = text.slice(0, cl.end - 1) + methods + text.slice(cl.end - 1); fs.writeFileSync(controller, text);
const costController = 'apps/poms-api/src/app/features/project-cost/project-cost.controller.ts';
imports(costController, '@poms/api-contracts', [...newCost.map(n => n + 'Dto'), 'ProjectCostCommandResultDto']);
imports(costController, '@nestjs/swagger', ['ApiQuery']);
imports(costController, '@poms/shared-contracts', ['ProjectActualCostTypeValue', 'ProjectActualCostRecordStatusValue', 'ProjectActualCostSourceTypeValue']);
text = fs.readFileSync(costController, 'utf8'); ast = ts.createSourceFile(costController, text, ts.ScriptTarget.Latest, true);
const responseClasses = { publishInternalCostRateVersion: 'ProjectCostCommandResultDto', createProjectActualCostRecord: 'ProjectCostCommandResultDto', replaceLaborCostRecord: 'ProjectCostCommandResultDto', confirmSharedCostAllocationBasis: 'ConfirmSharedCostAllocationBasisResultDto', replaceSharedCostAllocationResult: 'ReplaceSharedCostAllocationResultResultDto', confirmCostStageAttribution: 'ConfirmCostStageAttributionResultDto', reclassifyCostStageAttribution: 'ReclassifyCostStageAttributionResultDto', confirmAccountingTaxTreatment: 'ConfirmAccountingTaxTreatmentResultDto', replaceAccountingTaxTreatment: 'ReplaceAccountingTaxTreatmentResultDto' };
const edits = [];
for (const c of ast.statements.filter(ts.isClassDeclaration)) for (const m of c.members.filter(ts.isMethodDeclaration)) {
    const name = m.name.getText(ast); const decorators = ts.canHaveDecorators(m) ? ts.getDecorators(m) ?? [] : [];
    if (responseClasses[name]) {
        const response = decorators.find(d => ts.isCallExpression(d.expression) && d.expression.expression.getText(ast) === 'ApiCreatedResponse'); assert(response, name);
        edits.push({ start: response.getStart(ast), end: response.end, text: `@ApiCreatedResponse({ type: ${responseClasses[name]} })` });
    }
    if (name === 'listProjectActualCostRecords') edits.push({ start: m.getStart(ast), end: m.getStart(ast), text: "@ApiQuery({ name: 'costType', required: false, enum: ProjectActualCostTypeValue })\n    @ApiQuery({ name: 'recordStatus', required: false, enum: ProjectActualCostRecordStatusValue })\n    @ApiQuery({ name: 'sourceType', required: false, enum: ProjectActualCostSourceTypeValue })\n    " });
}
for (const edit of edits.sort((a, b) => b.start - a.start)) text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
fs.writeFileSync(costController, text);
console.log(JSON.stringify({ newHandoverRoutes: 2, addedDtoClasses: 9, declaredSuccessResponses: Object.keys(responseClasses).length, queryParameters: 3, nativeNewBehavior: 'explicit501', rustDeliveryClaim: false }));
