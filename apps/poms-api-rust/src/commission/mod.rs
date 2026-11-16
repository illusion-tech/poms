//! Commission rules, calculations and adjustments share the authenticated
//! HTTP transaction. Auxiliary acceptance ledgers are not part of this service.
mod adjustment;
pub mod model;
mod service;
pub use model::Request;
pub use service::execute;

/// Only implemented operations enter the public router and OpenAPI document.
pub const ROUTES: &[(&str, &str, &str, &str, u16)] = &[
    (
        "GET",
        "/api/commission-rule-versions",
        "CommissionController_listRuleVersions",
        "commission:rule-versions:manage",
        200,
    ),
    (
        "POST",
        "/api/commission-rule-versions",
        "CommissionController_createRuleVersion",
        "commission:rule-versions:manage",
        200,
    ),
    (
        "POST",
        "/api/commission-rule-versions/{id}:activate",
        "CommissionController_activateRuleVersion",
        "commission:rule-versions:manage",
        200,
    ),
    (
        "POST",
        "/api/commission-rule-versions/{id}:stop",
        "CommissionController_stopRuleVersion",
        "commission:rule-versions:manage",
        200,
    ),
    (
        "GET",
        "/api/projects/{projectId}/commission-calculations",
        "CommissionController_listCalculations",
        "commission:calculations:manage",
        200,
    ),
    (
        "POST",
        "/api/projects/{projectId}/commission-calculations",
        "CommissionController_createCalculation",
        "commission:calculations:manage",
        200,
    ),
    (
        "POST",
        "/api/commission-calculations/{id}:approve",
        "CommissionController_approveCalculation",
        "commission:calculations:manage",
        200,
    ),
    (
        "POST",
        "/api/commission-calculations/{id}:recalculate",
        "CommissionController_recalculateCalculation",
        "commission:calculations:manage",
        200,
    ),
    (
        "GET",
        "/api/projects/{projectId}/commission-adjustments",
        "CommissionController_listAdjustments",
        "commission:adjustments:manage",
        200,
    ),
    (
        "POST",
        "/api/projects/{projectId}/commission-adjustments",
        "CommissionController_createAdjustment",
        "commission:adjustments:manage",
        200,
    ),
    (
        "POST",
        "/api/commission-adjustments/{id}:submitApproval",
        "CommissionController_submitAdjustmentApproval",
        "commission:adjustments:manage",
        200,
    ),
    (
        "POST",
        "/api/commission-adjustments/{id}:execute",
        "CommissionController_executeAdjustment",
        "commission:adjustments:manage",
        200,
    ),
];
