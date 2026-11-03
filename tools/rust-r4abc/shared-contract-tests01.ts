import { strict as assert } from 'node:assert';
import {
    R4PositiveMoneyStringSchema, R4NonnegativeMoneyStringSchema, R4RatioStringSchema,
    CreateContractRequestSchema, SubmitContractReviewRequestSchema,
    CreateCommercialReleaseBaselineRequestSchema, ContractSelectionQuerySchema,
    ReadinessInitializationResultSchema, CreatePayableRecordRequestSchema
} from '@poms/shared-contracts';

let assertions = 0;
const ok = (value: boolean, message: string) => { assert(value, message); assertions++; };
for (const value of ['0.01', '1', '1.2', '9999999999999999.99', '0000001.20', ' 1.20 ']) {
    ok(R4PositiveMoneyStringSchema.safeParse(value).success, `positive exact amount ${value}`);
}
for (const value of ['0', '-1', '+1', '1.001', '1e2', 'NaN', 'Infinity', '10000000000000000.00', '.1', '1.', '1,000']) {
    ok(!R4PositiveMoneyStringSchema.safeParse(value).success, `reject invalid amount ${value}`);
}
ok(R4NonnegativeMoneyStringSchema.safeParse('0.00').success, 'tax can be zero');
for (const value of ['0', '1', '0.1300']) ok(R4RatioStringSchema.safeParse(value).success, `ratio ${value}`);
for (const value of ['1.0001', '0.13001', '-0.1', '1e-2']) ok(!R4RatioStringSchema.safeParse(value).success, `invalid ratio ${value}`);
const projectId='00000000-0000-4000-8000-000000000001';
const contractId='00000000-0000-4000-8000-000000000002';
const preparationId='00000000-0000-4000-8000-000000000003';
const readinessId='00000000-0000-4000-8000-000000000004';
const planId='00000000-0000-4000-8000-000000000005';
const snapshotId='00000000-0000-4000-8000-000000000006';
const initId='00000000-0000-4000-8000-000000000007';
ok(CreateContractRequestSchema.safeParse({projectId,signedAmount:'10.00'}).success, 'create draft default');
ok(!CreateContractRequestSchema.safeParse({projectId,signedAmount:'10.00',status:'active'}).success, 'cannot create active');
ok(!SubmitContractReviewRequestSchema.safeParse({}).success, 'review requires actual preparation');
ok(SubmitContractReviewRequestSchema.safeParse({preparationId}).success, 'review exact prepared reference');
const terms={contractId,amountTaxInclusive:'10.00',amountTaxExclusive:'10.00',taxRate:'0.0000',downPaymentRate:'0.0000',retentionRate:'0.0000',retentionDueDate:null,paymentTerms:'一次付清',receivablePlanSeeds:[{nodeKey:'full',label:'全部应收',plannedAmount:'10.00',plannedDate:'2026-11-10',isRetentionNode:false,sortOrder:0}]};
ok(CreateCommercialReleaseBaselineRequestSchema.safeParse({projectId,baselineCode:'source-01',contractTerms:[terms]}).success, 'baseline does not need client diff assertion');
ok(!CreateCommercialReleaseBaselineRequestSchema.safeParse({projectId,baselineCode:'source-01',contractTerms:[terms,{...terms,contractId:contractId.toUpperCase()}]}).success, 'same contract UUID cannot be duplicated');
ok(ContractSelectionQuerySchema.safeParse({}).success, 'selection may be omitted for unique contract');
ok(!ContractSelectionQuerySchema.safeParse({contractId:['x','y']}).success, 'duplicate query values are not a UUID');
const prepared={targetId:preparationId,targetType:'contract-term-preparation',sourceReadinessId:readinessId,contractId,resultStatus:'prepared',businessStatusAfter:'prepared',preparationId,preparationVersion:1,snapshotId:null,newVersionId:null,planVersionId:null,planVersion:null,initRecordId:null};
ok(ReadinessInitializationResultSchema.safeParse(prepared).success, 'prepared receipt has real preparation target');
ok(!ReadinessInitializationResultSchema.safeParse({...prepared,targetId:readinessId}).success, 'package cannot masquerade as preparation target');
const initialized={...prepared,targetId:planId,targetType:'receivable-plan-version',resultStatus:'initialized',businessStatusAfter:'active',snapshotId,newVersionId:planId,planVersionId:planId,planVersion:1,initRecordId:initId};
ok(ReadinessInitializationResultSchema.safeParse(initialized).success, 'plan receipt has real snapshot and persisted plan');
ok(!ReadinessInitializationResultSchema.safeParse({...initialized,initRecordId:null}).success, 'formal plan requires initialization record');
ok(CreatePayableRecordRequestSchema.safeParse({vendorName:'供应商',costCategory:'采购',payableDescription:'测试',amountExcludingTax:'100.00',taxAmount:'1.00',amountIncludingTax:'200.00',expectedPaymentDate:'2026-11-10'}).success, 'well-formed but inconsistent tuple reaches domain422');
console.log(JSON.stringify({kind:'R4-real-shared-schema-boundary-tests',assertions,passed:true,databaseOrRuntimeBusinessExecuted:false}));
