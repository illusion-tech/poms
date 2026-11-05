//! Literal guidance and entry projection from ProjectQueryService. Entry
//! permission sets deliberately differ from its broader allowed-action test.

use serde_json::{Value, json};

use super::{
    service::{Error, iso},
    store::Snapshot,
};
use crate::projects::{
    model::{js, trim_js},
    store::ProjectRow,
};

struct Text {
    headline: String,
    current_focus: String,
    current_gap: String,
    next_step: String,
    owner_fallback: String,
}

impl Text {
    fn new(
        headline: &str,
        current_focus: &str,
        current_gap: &str,
        next_step: &str,
        owner_fallback: &str,
    ) -> Self {
        Self {
            headline: headline.into(),
            current_focus: current_focus.into(),
            current_gap: current_gap.into(),
            next_step: next_step.into(),
            owner_fallback: owner_fallback.into(),
        }
    }
}

pub(crate) fn stage_label(stage: &str) -> &str {
    match stage {
        "assessment" => "立项评估",
        "scope-confirmation" => "范围确认",
        "commercial-closure" => "商务收口",
        "contracting" => "签约中",
        "handover" => "项目移交",
        "execution" => "正式执行",
        "acceptance" => "验收确认",
        "completed" => "已完成",
        "closed-lost" => "已丢单",
        "closed-terminated" => "已终止",
        _ => stage,
    }
}

fn status_label(status: &str) -> &str {
    match status {
        "active" => "进行中",
        "pending-approval" => "待审批",
        "blocked" => "阻塞中",
        "on-hold" => "已挂起",
        "completed" => "已完成",
        "closed" => "已关闭",
        _ => status,
    }
}

fn stage_text(stage: &str) -> Option<Text> {
    Some(match stage {
        "assessment" => Text::new(
            "先判断这个项目是否值得继续推进",
            "完成立项评估与机会判断。",
            "需要补齐客户背景、关键风险和是否继续投入的判断。",
            "确认范围后进入范围确认。",
            "销售负责人",
        ),
        "scope-confirmation" => Text::new(
            "把范围、排除项和前期成本先说清楚",
            "收口技术边界、排除项和前期成本。",
            "需要明确范围、风险和估算依据。",
            "范围和风险清楚后进入商务收口。",
            "技术支持 / 售前",
        ),
        "commercial-closure" => Text::new(
            "把报价、投标和成交条件统一到一个口径",
            "统一报价、投标和成交条件判断。",
            "需要完成报价、投标或商务条件收口。",
            "满足签约前置条件后进入签约。",
            "销售负责人 / 商务负责人",
        ),
        "contracting" => Text::new(
            "把合同登记、审核和生效做成正式依据",
            "完成合同登记、审核和生效。",
            "需要形成正式合同和签约依据。",
            "合同生效后进入项目移交。",
            "商务行政 / 销售负责人",
        ),
        "handover" => Text::new(
            "把项目移交清楚，避免责任边界不明",
            "完成项目移交并明确责任边界。",
            "需要完成移交确认、责任归口和下游冻结依据。",
            "移交完成后进入正式执行。",
            "销售 / 技术支持 / 项目负责人",
        ),
        "execution" => Text::new(
            "围绕经营、回款、成本和提成条件持续推进",
            "跟进经营总览、偏差风险和阶段解释。",
            "若缺少经营快照、回款或成本事实，相关页面会提示待补条件。",
            "优先查看经营总览、偏差风险和阶段解释。",
            "项目负责人 / 财务",
        ),
        "acceptance" => Text::new(
            "核对验收事实与收尾条件",
            "核对验收事实、最终结算和质保金相关条件。",
            "需要补齐验收、最终结算或质保金相关事实。",
            "满足完成条件后进入项目完成。",
            "项目负责人 / 财务",
        ),
        "completed" => Text::new(
            "项目主线已完成，重点看归档和结算",
            "查看最终结算、规则解释和归档结果。",
            "如仍有质保金或结算事项，请进入提成相关页面处理。",
            "按归档结果处理后续复核或质保金事项。",
            "项目负责人 / 财务",
        ),
        "closed-lost" => Text::new(
            "项目已丢单",
            "查看关闭原因和归档事实。",
            "项目已关闭，不再推进后续阶段。",
            "保留归档依据，必要时复盘客户和商务原因。",
            "销售负责人",
        ),
        "closed-terminated" => Text::new(
            "项目已终止",
            "查看终止原因和归档事实。",
            "项目已关闭，不再推进后续阶段。",
            "保留终止依据，必要时复盘合同和交付风险。",
            "项目负责人",
        ),
        _ => return None,
    })
}

fn is_closed(project: &ProjectRow) -> bool {
    project.status == "closed"
        || matches!(
            project.current_stage.as_str(),
            "closed-lost" | "closed-terminated"
        )
}

fn commission_stage(stage: &str) -> bool {
    matches!(stage, "handover" | "execution" | "acceptance" | "completed")
}

fn blocking_reasons(project: &ProjectRow) -> Vec<String> {
    let mut reasons = Vec::new();
    if project.status == "blocked" {
        reasons.push("项目已标记为阻塞，需要先明确阻断原因和解除责任。".into());
    }
    if is_closed(project) {
        reasons.push(
            project
                .closed_reason
                .as_deref()
                .filter(|value| !value.is_empty())
                .map_or_else(
                    || "项目已关闭，不再推进后续阶段。".into(),
                    |value| format!("项目已关闭：{value}"),
                ),
        );
    }
    reasons
}

fn text(project: &ProjectRow, reasons: &[String]) -> Text {
    let label = stage_label(&project.current_stage);
    match project.status.as_str() {
        "blocked" => {
            return Text::new(
                &format!("{label}存在阻断，先处理卡点。"),
                "先把阻断原因、责任人和解除条件说清楚。",
                &if reasons.is_empty() {
                    "当前项目被标记为阻塞，需要补充阻断说明。".into()
                } else {
                    reasons.join("；")
                },
                "阻断解除后再回到项目主线继续推进。",
                "项目负责人",
            );
        }
        "pending-approval" => {
            return Text::new(
                &format!("{label}正在等待审批。"),
                "跟进审批结论和必要补充材料。",
                "需要审批通过后再推进下一步。",
                "审批通过后回到当前阶段主线继续处理。",
                "流程负责人",
            );
        }
        "on-hold" => {
            return Text::new(
                &format!("{label}已挂起。"),
                "确认挂起原因、恢复条件和下一次检查时间。",
                "项目恢复前不应继续推进后续动作。",
                "恢复条件满足后再回到当前阶段主线。",
                "项目负责人",
            );
        }
        _ => {}
    }
    if is_closed(project) {
        let mut text = stage_text(&project.current_stage).unwrap_or_else(|| {
            Text::new(
                "项目已关闭。",
                "查看关闭原因和归档事实。",
                "",
                "查看归档事实和结算结果。",
                "项目负责人",
            )
        });
        text.current_gap = project
            .closed_reason
            .as_deref()
            .filter(|value| !value.is_empty())
            .map_or_else(
                || "项目已关闭，不再推进后续阶段。".into(),
                |value| format!("项目已关闭：{value}"),
            );
        return text;
    }
    stage_text(&project.current_stage).unwrap_or_else(|| {
        Text::new(
            &format!("{label}正在推进。"),
            "确认当前阶段事实和下一步责任。",
            "需要补齐当前阶段的业务依据。",
            "依据当前阶段结果推进到下一步。",
            "项目负责人",
        )
    })
}

fn owner_label(owner_name: Option<&str>, owner_org_name: Option<&str>, fallback: &str) -> String {
    // A missing or blank display name cannot hide an available organization or
    // the stage's responsibility label. Use project text trimming only to
    // decide availability; preserve meaningful stored display text verbatim.
    let owner_name = owner_name.filter(|value| !trim_js(js(value)).is_empty());
    let owner_org_name = owner_org_name.filter(|value| !trim_js(js(value)).is_empty());
    if let (Some(name), Some(org)) = (owner_name, owner_org_name) {
        return format!("{name} / {org}");
    }
    owner_name.or(owner_org_name).unwrap_or(fallback).to_owned()
}

fn allowed_actions(project: &ProjectRow, permissions: &[&str]) -> Vec<&'static str> {
    let mut actions = vec!["view-project-workspace"];
    if !is_closed(project) && permissions.contains(&"project:write") {
        actions.push("edit-project-basic-info");
    }
    if matches!(project.status.as_str(), "active" | "blocked")
        && permissions.contains(&"project:write")
    {
        actions.push("reassign-project-owner");
    }
    if !is_closed(project)
        && commission_stage(&project.current_stage)
        && [
            "commission:assignments:manage",
            "commission:calculations:manage",
            "commission:payouts:manage",
            "commission:adjustments:manage",
            "commission:rule-versions:manage",
        ]
        .iter()
        .any(|value| permissions.contains(value))
    {
        actions.push("manage-project-commission");
    }
    actions
}

struct Entry {
    key: &'static str,
    label: &'static str,
    description: &'static str,
    path: &'static str,
    stage_reason: &'static str,
    permission_reason: &'static str,
    action_key: &'static str,
}

fn entry_value(
    prefix: &str,
    entry: &Entry,
    closed: bool,
    stage_ready: bool,
    permission_ready: bool,
) -> Value {
    let disabled_reason = if closed {
        Some("项目已关闭，只能查看归档信息。")
    } else if !stage_ready {
        Some(entry.stage_reason)
    } else if !permission_ready {
        Some(entry.permission_reason)
    } else {
        None
    };
    json!({"key":entry.key,"label":entry.label,"description":entry.description,
        "route":format!("{prefix}{}",entry.path),"enabled":!closed && stage_ready && permission_ready,
        "disabledReason":disabled_reason,"actionKey":entry.action_key})
}

fn entries(project: &ProjectRow, permissions: &[&str], actions: &[&str]) -> Vec<Value> {
    let closed = is_closed(project);
    let stage = project.current_stage.as_str();
    let finance_stage = matches!(stage, "execution" | "acceptance" | "completed");
    let commission_stage = commission_stage(stage);
    let settlement_stage = matches!(stage, "acceptance" | "completed");
    let all = |required: &[&str]| {
        required
            .iter()
            .all(|permission| permissions.contains(permission))
    };
    let view = actions.contains(&"view-project-workspace");
    let pre_signing = all(&["project:read"]) && view;
    let finance = all(&["project:read", "contract:finance:manage"]);
    let payout = all(&["project:read", "commission:payouts:manage"]);
    let freeze = all(&["project:read", "commission:assignments:manage"]);
    let operations = all(&[
        "project:read",
        "commission:rule-versions:manage",
        "commission:calculations:manage",
        "commission:payouts:manage",
        "commission:adjustments:manage",
    ]) && actions.contains(&"manage-project-commission");
    let prefix = format!("/projects/{}", project.id);
    let mut result = vec![
        json!({"key":"project-detail","label":"项目详情","description":"查看项目主体、负责人、合同、审批和确认情况。","route":prefix,"enabled":true,"disabledReason":null,"actionKey":"project:read"}),
        json!({"key":"workspace-home","label":"工作区总览","description":"查看当前阶段、缺口、下一步和推荐入口。","route":format!("{prefix}/workspace"),"enabled":view,
            "disabledReason":if view { None } else { Some("当前账号不能查看项目工作区。") },"actionKey":"view-project-workspace"}),
    ];
    if matches!(
        stage,
        "assessment" | "scope-confirmation" | "commercial-closure" | "contracting"
    ) {
        for entry in [
            Entry {
                key: "pre-signing-workspace",
                label: "签约前主线",
                description: "查看签约前当前阶段、阻断原因、下一步和责任归口。",
                path: "/workspace/pre-signing",
                stage_reason: "项目进入签约前阶段后再查看签约前主线。",
                permission_reason: "需要项目查看权限。",
                action_key: "view-project-workspace",
            },
            Entry {
                key: "technical-cost-workspace",
                label: "技术与成本",
                description: "查看技术可行性、范围边界、风险保留和前期成本估算。",
                path: "/workspace/technical-cost",
                stage_reason: "项目进入签约前阶段后再查看技术与成本。",
                permission_reason: "需要项目查看权限。",
                action_key: "view-project-workspace",
            },
            Entry {
                key: "bid-commercial-workspace",
                label: "招投标 / 商务竞标",
                description: "查看竞标形态、阶段、决策、材料齐备度、结果和下一步。",
                path: "/workspace/bid-commercial",
                stage_reason: "项目进入签约前阶段后再查看招投标 / 商务竞标。",
                permission_reason: "需要项目查看权限。",
                action_key: "view-project-workspace",
            },
            Entry {
                key: "pricing-margin-workspace",
                label: "报价与毛利评审",
                description: "查看报价、成本引用、税务回款条件、毛利判断、放行结论和签约承接。",
                path: "/workspace/pricing-margin",
                stage_reason: "项目进入签约前阶段后再查看报价与毛利评审。",
                permission_reason: "需要项目查看权限。",
                action_key: "view-project-workspace",
            },
        ] {
            result.push(entry_value(&prefix, &entry, closed, true, pre_signing));
        }
    }
    if stage == "handover" {
        result.push(entry_value(
            &prefix,
            &Entry {
                key: "handover-workspace",
                label: "合同承接",
                description: "查看合同生效后到正式移交前的承接状态、基线和阻断事项。",
                path: "/workspace/contract-handover",
                stage_reason: "项目进入移交阶段后再查看合同承接。",
                permission_reason: "需要项目查看权限。",
                action_key: "view-project-workspace",
            },
            closed,
            true,
            pre_signing,
        ));
    }
    for (entry, stage_ready, permission_ready) in [
        (
            Entry {
                key: "operating-overview",
                label: "经营总览",
                description: "查看收入、成本、回款和经营口径。",
                path: "/workspace/operating-overview",
                stage_reason: "项目进入正式执行后再查看经营总览。",
                permission_reason: "需要项目查看和合同资金权限。",
                action_key: "contract:finance:manage",
            },
            finance_stage,
            finance,
        ),
        (
            Entry {
                key: "variance-risk",
                label: "偏差与风险",
                description: "查看经营偏差、风险等级和建议动作。",
                path: "/workspace/variance-risk",
                stage_reason: "项目进入正式执行后再查看偏差与风险。",
                permission_reason: "需要项目查看和合同资金权限。",
                action_key: "contract:finance:manage",
            },
            finance_stage,
            finance,
        ),
        (
            Entry {
                key: "commission-freeze-binding",
                label: "冻结与责任边界",
                description: "查看提成冻结版本、责任边界、参与人权重和移交收口关系。",
                path: "/commission/freeze-binding",
                stage_reason: "项目进入移交或执行阶段后再查看冻结与责任边界。",
                permission_reason: "需要项目查看和提成角色冻结权限。",
                action_key: "commission:assignments:manage",
            },
            commission_stage,
            freeze,
        ),
        (
            Entry {
                key: "commission-gate-overview",
                label: "提成阶段解释",
                description: "查看当前阶段是否满足提成闸口条件。",
                path: "/commission/gate-overview",
                stage_reason: "项目进入移交或执行阶段后再查看提成阶段解释。",
                permission_reason: "需要项目查看和合同资金权限。",
                action_key: "contract:finance:manage",
            },
            commission_stage,
            finance,
        ),
        (
            Entry {
                key: "commission-final-settlement",
                label: "最终结算",
                description: "查看最终结算、质保金和发放条件。",
                path: "/commission/final-settlement",
                stage_reason: "项目进入验收或完成阶段后再查看最终结算。",
                permission_reason: "需要项目查看和提成发放权限。",
                action_key: "commission:payouts:manage",
            },
            settlement_stage,
            payout,
        ),
        (
            Entry {
                key: "commission-rule-explanation",
                label: "规则解释",
                description: "查看当前项目适用的提成规则和解释口径。",
                path: "/commission/rule-explanation",
                stage_reason: "项目进入移交或执行阶段后再查看规则解释。",
                permission_reason: "需要项目查看和提成发放权限。",
                action_key: "commission:payouts:manage",
            },
            commission_stage,
            payout,
        ),
        (
            Entry {
                key: "commission-operations",
                label: "提成操作",
                description: "处理提成规则、计算、发放和调整。",
                path: "/commission/operations",
                stage_reason: "项目进入移交或执行阶段后再处理提成操作。",
                permission_reason: "需要完整的提成治理操作权限。",
                action_key: "manage-project-commission",
            },
            commission_stage,
            operations,
        ),
    ] {
        result.push(entry_value(
            &prefix,
            &entry,
            closed,
            stage_ready,
            permission_ready,
        ));
    }
    result
}

pub(crate) fn view(
    project: &ProjectRow,
    owner_name: Option<&str>,
    owner_org_name: Option<&str>,
    snapshot: Option<&Snapshot>,
    permissions: &[&str],
    generated_at: String,
) -> Result<Value, Error> {
    let reasons = blocking_reasons(project);
    let text = text(project, &reasons);
    let actions = allowed_actions(project, permissions);
    Ok(json!({
        "projectId":project.id,"currentStage":project.current_stage,"status":project.status,
        "currentStageLabel":stage_label(&project.current_stage),"statusLabel":status_label(&project.status),
        "headline":text.headline,"currentFocus":text.current_focus,"currentGap":text.current_gap,"nextStep":text.next_step,
        "ownerLabel":owner_label(owner_name, owner_org_name, &text.owner_fallback),"blockingReasons":reasons,
        "basisSummary":{
            "summarySnapshotId":snapshot.map(|value| value.id),
            "projectionLevel":snapshot.map(|value| &value.projection_level),
            "exportPolicy":snapshot.map(|value| &value.export_policy),
            "generatedAt":snapshot.map(|value| iso(value.generated_at)).transpose()?,
        },
        "recommendedEntries":entries(project, permissions, &actions),"generatedAt":generated_at,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::model::clock_now;
    use uuid::Uuid;

    fn project(stage: &str, status: &str) -> ProjectRow {
        let now = clock_now();
        ProjectRow {
            id: Uuid::from_u128(1),
            project_no: "P1".into(),
            project_name: "project".into(),
            source_lead_id: None,
            customer_id: None,
            customer_name: None,
            customer_project_no: None,
            status: status.into(),
            current_stage: stage.into(),
            owner_org_id: None,
            owner_user_id: None,
            planned_sign_at: None,
            closed_at: None,
            closed_reason: None,
            row_version: 1,
            created_at: now,
            created_by: None,
            updated_at: now,
            updated_by: None,
        }
    }

    #[test]
    fn all_stages_keep_the_source_entry_order_and_full_projection() {
        for stage in [
            "assessment",
            "scope-confirmation",
            "commercial-closure",
            "contracting",
            "handover",
            "execution",
            "acceptance",
            "completed",
            "closed-lost",
            "closed-terminated",
        ] {
            let value = view(
                &project(stage, "active"),
                None,
                None,
                None,
                &["project:read"],
                "now".into(),
            )
            .unwrap_or_else(|_| panic!("guidance"));
            assert_eq!(value.as_object().map(|value| value.len()), Some(14));
            assert!(value.get("allowedActions").is_none());
            let entries = value["recommendedEntries"]
                .as_array()
                .unwrap_or_else(|| panic!("entries"));
            assert_eq!(
                entries.len(),
                if matches!(
                    stage,
                    "assessment" | "scope-confirmation" | "commercial-closure" | "contracting"
                ) {
                    13
                } else if stage == "handover" {
                    10
                } else {
                    9
                }
            );
            assert_eq!(entries[0]["key"], "project-detail");
            assert_eq!(entries[1]["key"], "workspace-home");
            assert_eq!(
                entries.last().map(|value| &value["key"]),
                Some(&json!("commission-operations"))
            );
            assert!(
                entries
                    .iter()
                    .all(|value| value.as_object().map(|value| value.len()) == Some(7))
            );
            for field in [
                "summarySnapshotId",
                "projectionLevel",
                "exportPolicy",
                "generatedAt",
            ] {
                assert!(value["basisSummary"][field].is_null());
            }
        }
    }

    #[test]
    fn status_priority_and_closed_reasons_remain_business_guidance() {
        let mut row = project("closed-lost", "blocked");
        row.closed_reason = Some("原因".into());
        let reasons = blocking_reasons(&row);
        assert_eq!(reasons.len(), 2);
        assert_eq!(
            text(&row, &reasons).headline,
            "已丢单存在阻断，先处理卡点。"
        );
        row.status = "pending-approval".into();
        assert_eq!(text(&row, &reasons).headline, "已丢单正在等待审批。");
        row.status = "on-hold".into();
        assert_eq!(text(&row, &reasons).headline, "已丢单已挂起。");
    }

    #[test]
    fn owner_label_uses_available_responsibility_without_an_empty_label() {
        for (name, org, expected) in [
            (None, None, "阶段归口"),
            (Some(""), None, "阶段归口"),
            (Some(""), Some("组织"), "组织"),
            (Some("姓名"), Some(""), "姓名"),
            (Some("\u{feff} \u{3000}"), Some("\t\n"), "阶段归口"),
            (Some("\u{feff}"), Some("组织"), "组织"),
            (Some("姓名"), Some("组织"), "姓名 / 组织"),
            (Some(" 姓名 "), None, " 姓名 "),
        ] {
            let label = owner_label(name, org, "阶段归口");
            assert_eq!(label, expected);
            assert!(!trim_js(js(&label)).is_empty());
        }
    }

    #[test]
    fn completed_remains_open_and_commission_entry_requires_every_permission() {
        let row = project("completed", "completed");
        assert!(!is_closed(&row));
        let partial = ["project:read", "commission:payouts:manage"];
        let actions = allowed_actions(&row, &partial);
        assert!(actions.contains(&"manage-project-commission"));
        let values = entries(&row, &partial, &actions);
        assert_eq!(
            values.last().map(|value| &value["enabled"]),
            Some(&json!(false))
        );
        let full = [
            "project:read",
            "commission:payouts:manage",
            "commission:rule-versions:manage",
            "commission:calculations:manage",
            "commission:adjustments:manage",
        ];
        let actions = allowed_actions(&row, &full);
        assert_eq!(
            entries(&row, &full, &actions)
                .last()
                .map(|value| &value["enabled"]),
            Some(&json!(true))
        );
        let closed_stage = project("closed-lost", "active");
        assert!(
            allowed_actions(&closed_stage, &["project:write"]).contains(&"reassign-project-owner")
        );
    }

    #[test]
    fn disabled_reasons_prefer_closed_then_stage_then_permission() {
        for (stage, status, expected) in [
            ("assessment", "closed", "项目已关闭，只能查看归档信息。"),
            ("assessment", "active", "项目进入正式执行后再查看经营总览。"),
            ("execution", "active", "需要项目查看和合同资金权限。"),
        ] {
            let row = project(stage, status);
            let values = entries(&row, &[], &allowed_actions(&row, &[]));
            let operating = values
                .iter()
                .find(|value| value["key"] == "operating-overview")
                .unwrap_or_else(|| panic!("operating entry"));
            assert_eq!(operating["disabledReason"], expected);
        }
    }
}
