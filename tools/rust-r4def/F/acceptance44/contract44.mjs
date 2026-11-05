// Static frozen contract data; importing performs no I/O.
export const OPERATIONS = Object.freeze({
  "ProjectHandoverController_getProjectHandoverDetailByProject": {
    "method": "GET",
    "path": "/api/projects/{projectId}/project-handover",
    "success": 200,
    "group": "D"
  },
  "ProjectCostController_publishInternalCostRateVersion": {
    "method": "POST",
    "path": "/api/internal-cost-rate-versions",
    "success": 201,
    "group": "E"
  },
  "ProjectCostController_createProjectActualCostRecord": {
    "method": "POST",
    "path": "/api/projects/{projectId}/actual-cost-records",
    "success": 201,
    "group": "E"
  },
  "ProjectCostController_listExpenseRecords": {
    "method": "GET",
    "path": "/api/projects/{projectId}/expense-records",
    "success": 200,
    "group": "E"
  },
  "ProjectCostController_getExpenseRecordDetail": {
    "method": "GET",
    "path": "/api/expense-records/{id}",
    "success": 200,
    "group": "E"
  },
  "ProjectCostController_createExpenseRecord": {
    "method": "POST",
    "path": "/api/projects/{projectId}/expense-records",
    "success": 201,
    "group": "E"
  },
  "ProjectCostController_updateExpenseRecord": {
    "method": "PATCH",
    "path": "/api/expense-records/{id}",
    "success": 200,
    "group": "E"
  },
  "ProjectCostController_confirmExpenseRecord": {
    "method": "POST",
    "path": "/api/expense-records/{id}:confirm",
    "success": 200,
    "group": "E"
  },
  "ProjectCostController_voidExpenseRecord": {
    "method": "POST",
    "path": "/api/expense-records/{id}:void",
    "success": 200,
    "group": "E"
  },
  "ProjectCostController_listProjectActualCostRecords": {
    "method": "GET",
    "path": "/api/projects/{projectId}/actual-cost-records",
    "success": 200,
    "group": "E"
  },
  "ProjectCostController_getProjectActualCostRecordDetail": {
    "method": "GET",
    "path": "/api/project-actual-cost-records/{id}",
    "success": 200,
    "group": "E"
  },
  "ProjectCostController_replaceLaborCostRecord": {
    "method": "POST",
    "path": "/api/project-actual-cost-records/{id}:replace",
    "success": 201,
    "group": "E"
  },
  "ProjectCostController_confirmSharedCostAllocationBasis": {
    "method": "POST",
    "path": "/api/shared-cost-allocation-bases",
    "success": 201,
    "group": "F"
  },
  "ProjectCostController_getSharedCostAllocationBasis": {
    "method": "GET",
    "path": "/api/shared-cost-allocation-bases/{id}",
    "success": 200,
    "group": "F"
  },
  "ProjectCostController_listSharedCostAllocationResults": {
    "method": "GET",
    "path": "/api/shared-cost-allocation-bases/{id}/results",
    "success": 200,
    "group": "F"
  },
  "ProjectCostController_replaceSharedCostAllocationResult": {
    "method": "POST",
    "path": "/api/shared-cost-allocation-results/{id}:replace",
    "success": 201,
    "group": "F"
  },
  "ProjectCostController_confirmCostStageAttribution": {
    "method": "POST",
    "path": "/api/project-actual-cost-records/{id}/stage-attributions",
    "success": 201,
    "group": "F"
  },
  "ProjectCostController_reclassifyCostStageAttribution": {
    "method": "POST",
    "path": "/api/cost-stage-attributions/{id}:reclassify",
    "success": 201,
    "group": "F"
  },
  "ProjectCostController_listCostStageAttributions": {
    "method": "GET",
    "path": "/api/project-actual-cost-records/{costRecordId}/stage-attributions",
    "success": 200,
    "group": "F"
  },
  "ProjectCostController_getCostStageAttribution": {
    "method": "GET",
    "path": "/api/cost-stage-attributions/{id}",
    "success": 200,
    "group": "F"
  },
  "ProjectCostController_confirmAccountingTaxTreatment": {
    "method": "POST",
    "path": "/api/projects/{projectId}/accounting-tax-treatments",
    "success": 201,
    "group": "F"
  },
  "ProjectCostController_replaceAccountingTaxTreatment": {
    "method": "POST",
    "path": "/api/accounting-tax-treatments/{id}:replace",
    "success": 201,
    "group": "F"
  },
  "ProjectCostController_listAccountingTaxTreatments": {
    "method": "GET",
    "path": "/api/projects/{projectId}/accounting-tax-treatments",
    "success": 200,
    "group": "F"
  },
  "ProjectCostController_getAccountingTaxTreatment": {
    "method": "GET",
    "path": "/api/accounting-tax-treatments/{id}",
    "success": 200,
    "group": "F"
  },
  "ContractFinanceController_createPayable": {
    "method": "POST",
    "path": "/api/projects/{projectId}/payable-records",
    "success": 201,
    "group": "C-support"
  },
  "ContractFinanceController_getPayable": {
    "method": "GET",
    "path": "/api/payable-records/{id}",
    "success": 200,
    "group": "C-support"
  }
});
export const SOURCE_PINS = Object.freeze([
  {
    "group": "F46",
    "file": "E:\\projects\\worktrees\\poms-r4f-cost-governance\\poms\\apps\\poms-api-rust\\src\\project_cost_governance\\evidence.rs",
    "rawBytesSha256": "6c10996eec05d8c224fd2a02ade0a69eb17b8a497ed175b09609ab8fbbf42c53",
    "previousF25RawSha256": "6c10996eec05d8c224fd2a02ade0a69eb17b8a497ed175b09609ab8fbbf42c53"
  },
  {
    "group": "F46",
    "file": "E:\\projects\\worktrees\\poms-r4f-cost-governance\\poms\\apps\\poms-api-rust\\src\\project_cost_governance\\logic.rs",
    "rawBytesSha256": "a287ed9281b71681820cb868adf03c5fc6cc59bb950c2814b9e7a0bc0fa0b15f",
    "previousF25RawSha256": "18f818dd4cdecb970ee5ed5a0e3fe0b5c29cdd34e43e45204cde34d2880a312d"
  },
  {
    "group": "F46",
    "file": "E:\\projects\\worktrees\\poms-r4f-cost-governance\\poms\\apps\\poms-api-rust\\src\\project_cost_governance\\mod.rs",
    "rawBytesSha256": "ecbe9519abb24e6f06f39e3fb94ab4416e6fa4c9c2464c4606ccbac01ed83cc9",
    "previousF25RawSha256": "ecbe9519abb24e6f06f39e3fb94ab4416e6fa4c9c2464c4606ccbac01ed83cc9"
  },
  {
    "group": "F46",
    "file": "E:\\projects\\worktrees\\poms-r4f-cost-governance\\poms\\apps\\poms-api-rust\\src\\project_cost_governance\\projection.rs",
    "rawBytesSha256": "d525b70b521b3b7520345c77c9e547abe60080d7dd9644b515de876bef072725",
    "previousF25RawSha256": "d525b70b521b3b7520345c77c9e547abe60080d7dd9644b515de876bef072725"
  },
  {
    "group": "F46",
    "file": "E:\\projects\\worktrees\\poms-r4f-cost-governance\\poms\\apps\\poms-api-rust\\src\\project_cost_governance\\service.rs",
    "rawBytesSha256": "04f8c521b2d68ac743d7fdc3146db96c2a6ae5096e1fadba53505b039b43af13",
    "previousF25RawSha256": "c4c840d026610bbaf31b008d06985b8d635d221fffb4f27007b144a52b395b3c"
  },
  {
    "group": "F46",
    "file": "E:\\projects\\worktrees\\poms-r4f-cost-governance\\poms\\apps\\poms-api-rust\\src\\project_cost_governance\\store.rs",
    "rawBytesSha256": "6712ee261e4458df43fe3f1369dcdfa8a083de9e6f844f461a0eddc85a11867e",
    "previousF25RawSha256": "6712ee261e4458df43fe3f1369dcdfa8a083de9e6f844f461a0eddc85a11867e"
  },
  {
    "group": "E04",
    "file": "E:\\projects\\worktrees\\poms-r4e-cost-base\\poms\\apps\\poms-api-rust\\src\\project_actual_cost\\logic.rs",
    "rawBytesSha256": "96bdbc87dd031b59c6b895243241cd9b847eb9ae690766c5782183a5c0f9ba4c"
  },
  {
    "group": "E04",
    "file": "E:\\projects\\worktrees\\poms-r4e-cost-base\\poms\\apps\\poms-api-rust\\src\\project_actual_cost\\mod.rs",
    "rawBytesSha256": "aaaa5126be86c421255d699bcad582131943d7f500754f0db8e55ddfc437a407"
  },
  {
    "group": "E04",
    "file": "E:\\projects\\worktrees\\poms-r4e-cost-base\\poms\\apps\\poms-api-rust\\src\\project_actual_cost\\store.rs",
    "rawBytesSha256": "0b39d14477e52641307d84f28c043dcf9c4309d38d0f55476e7f9806cb621eb5"
  },
  {
    "group": "E04",
    "file": "E:\\projects\\worktrees\\poms-r4e-cost-base\\poms\\apps\\poms-api-rust\\src\\project_actual_cost\\view.rs",
    "rawBytesSha256": "943a93380de87fbddc06650f35acfaf467db1a17abf6c25c3af162a5955b53ac"
  }
]);
