//! Pure original preview, selection, dependency and per-item mutation rules.
use std::{
    cmp::Ordering,
    collections::{HashMap, HashSet, VecDeque},
};

use serde_json::{Value, json};
use uuid::Uuid;

use super::{
    directory::{ExternalDepartmentSnapshot, root_id},
    model::{Diff, Mapping, Meta, Org, Run, Source, text},
    service::ExternalOrgSyncError as E,
};
use crate::{
    auth::{js_json::JsString, model::clock_now},
    org_units::collation::sibling_name_key,
};

pub struct Preview {
    pub mappings: Vec<Mapping>,
    pub diff_items: Vec<Diff>,
    pub summary: Value,
}
fn diff(
    run: &Run,
    department: &ExternalDepartmentSnapshot,
    action: &str,
    target: (Option<Uuid>, Option<Value>),
    candidate: Value,
    error: Option<String>,
    actor: Option<Uuid>,
) -> Diff {
    let (org, before) = target;
    Diff {
        meta: Meta::new(actor),
        run_id: run.meta.id,
        external_department_id: department.external_department_id.clone(),
        action: action.into(),
        status: "pending".into(),
        org_unit_id: org,
        before_snapshot: before,
        candidate_snapshot: candidate,
        error_message: error,
        applied_at: None,
    }
}
fn conflict(
    run: &Run,
    department: &ExternalDepartmentSnapshot,
    error: String,
    actor: Option<Uuid>,
    org: Option<Uuid>,
) -> Diff {
    diff(
        run,
        department,
        "conflict",
        (org, None),
        json!({"externalDepartmentId":department.external_department_id,"externalDepartmentName":department.external_department_name,"externalParentDepartmentId":department.external_parent_department_id,"externalSnapshot":department.raw}),
        Some(error),
        actor,
    )
}
fn parent(
    source: &Source,
    department: &ExternalDepartmentSnapshot,
    mappings: &[Mapping],
    orgs: &[Org],
    departments: &HashMap<String, &ExternalDepartmentSnapshot>,
    planned: &HashSet<String>,
) -> (Option<Uuid>, Option<String>, Option<String>) {
    let parent = department
        .external_parent_department_id
        .clone()
        .unwrap_or_else(|| root_id(source.external_root_department_id.as_deref()));
    if parent == root_id(source.external_root_department_id.as_deref()) {
        return (source.authoritative_org_unit_id, None, None);
    }
    if let Some(mapping) = mappings
        .iter()
        .find(|mapping| mapping.external_department_id == parent)
        && let Some(id) = mapping.org_unit_id
    {
        let org = orgs.iter().find(|org| org.meta.id == id);
        return match org {
            None => (
                None,
                Some(parent),
                Some(format!("Mapped parent OrgUnit {id} was not found.")),
            ),
            Some(org) if !org.is_active => (
                Some(id),
                Some(parent),
                Some(format!("Mapped parent OrgUnit {id} is inactive.")),
            ),
            Some(_) => (Some(id), Some(parent), None),
        };
    }
    if departments.contains_key(&parent) || planned.contains(&parent) {
        (None, Some(parent), None)
    } else {
        (
            None,
            Some(parent.clone()),
            Some(format!(
                "External parent department {parent} is not mapped or present in this preview."
            )),
        )
    }
}

pub fn preview(
    source: &Source,
    run: &Run,
    departments: &[ExternalDepartmentSnapshot],
    existing: &[Mapping],
    orgs: &[Org],
    actor: Option<Uuid>,
) -> Preview {
    let now = clock_now();
    let by_department: HashMap<_, _> = departments
        .iter()
        .map(|department| (department.external_department_id.clone(), department))
        .collect();
    let mut mappings = Vec::new();
    let mut diffs = Vec::new();
    let mut planned = HashSet::new();
    for department in departments {
        // Deliberately do not add new mappings to the original lookup: duplicate
        // upstream IDs create duplicate rows and retain the original PG failure.
        let mut mapping = existing
            .iter()
            .rev()
            .find(|mapping| mapping.external_department_id == department.external_department_id)
            .cloned()
            .unwrap_or_else(|| Mapping {
                meta: Meta::new(actor),
                source_id: source.meta.id,
                external_department_id: department.external_department_id.clone(),
                external_parent_department_id: department.external_parent_department_id.clone(),
                external_department_name: department.external_department_name.clone(),
                org_unit_id: None,
                status: "unmapped".into(),
                external_snapshot: department.raw.clone(),
                last_seen_at: Some(now),
            });
        mapping.external_parent_department_id = department.external_parent_department_id.clone();
        mapping.external_department_name = department.external_department_name.clone();
        mapping.external_snapshot = department.raw.clone();
        mapping.last_seen_at = Some(now);
        mapping.meta.updated_by = actor;
        if mapping.org_unit_id.is_none() && mapping.status == "mapped" {
            mapping.status = "unmapped".into();
        }
        let generated = seen(
            department,
            &mapping,
            SeenContext {
                source,
                run,
                existing,
                orgs,
                departments: &by_department,
                planned: &planned,
                actor,
            },
        );
        mappings.push(mapping);
        if let Some(item) = generated {
            if item.action == "create_org_unit" {
                planned.insert(department.external_department_id.clone());
            }
            diffs.push(item);
        }
    }
    // Existing rows are one managed object in MikroORM. Repeated upstream IDs
    // still create a diff per occurrence, and all references to one existing
    // mapping observe its final in-memory snapshot at flush time.
    let final_existing: HashMap<Uuid, Mapping> = mappings
        .iter()
        .filter(|mapping| !mapping.meta.id.is_nil())
        .map(|mapping| (mapping.meta.id, mapping.clone()))
        .collect();
    for mapping in &mut mappings {
        if let Some(final_value) = final_existing.get(&mapping.meta.id) {
            *mapping = final_value.clone();
        }
    }
    for mapping in existing {
        if by_department.contains_key(&mapping.external_department_id)
            || mapping.status == "ignored"
            || mapping.org_unit_id.is_none()
        {
            continue;
        }
        let org = orgs
            .iter()
            .find(|org| Some(org.meta.id) == mapping.org_unit_id);
        let department = ExternalDepartmentSnapshot {
            external_department_id: mapping.external_department_id.clone(),
            external_department_name: mapping.external_department_name.clone(),
            external_parent_department_id: mapping.external_parent_department_id.clone(),
            is_active: false,
            display_order: None,
            raw: json!({}),
            raw_json: None,
        };
        diffs.push(diff(run,&department,if org.is_some(){"disable_org_unit"}else{"conflict"},(mapping.org_unit_id,org.map(Org::snapshot)),json!({"externalDepartmentId":mapping.external_department_id,"externalDepartmentName":mapping.external_department_name,"reason":if org.is_some(){"external_department_missing"}else{"mapped_org_unit_missing"}}),org.is_none().then(||"Mapped OrgUnit was not found.".into()),actor));
    }
    let mut counts = serde_json::Map::new();
    for item in &diffs {
        let count = counts
            .get(&item.action)
            .and_then(Value::as_i64)
            .unwrap_or(0)
            + 1;
        counts.insert(item.action.clone(), json!(count));
    }
    Preview {
        summary: json!({"externalDepartmentCount":departments.len(),"generatedItemCount":diffs.len(),"actionCounts":counts}),
        mappings,
        diff_items: diffs,
    }
}
struct SeenContext<'a, 'd> {
    source: &'a Source,
    run: &'a Run,
    existing: &'a [Mapping],
    orgs: &'a [Org],
    departments: &'a HashMap<String, &'d ExternalDepartmentSnapshot>,
    planned: &'a HashSet<String>,
    actor: Option<Uuid>,
}
fn seen(
    department: &ExternalDepartmentSnapshot,
    mapping: &Mapping,
    context: SeenContext<'_, '_>,
) -> Option<Diff> {
    let SeenContext {
        source,
        run,
        existing,
        orgs,
        departments,
        planned,
        actor,
    } = context;
    if mapping.status == "ignored" {
        return None;
    }
    if !department.is_active {
        let id = mapping.org_unit_id?;
        let org = orgs.iter().find(|org| org.meta.id == id);
        return Some(diff(
            run,
            department,
            if org.is_some() {
                "disable_org_unit"
            } else {
                "conflict"
            },
            (Some(id), org.map(Org::snapshot)),
            json!({"externalDepartmentId":department.external_department_id,"externalDepartmentName":department.external_department_name,"reason":if org.is_some(){"external_department_inactive"}else{"mapped_org_unit_missing"}}),
            org.is_none()
                .then(|| "Mapped OrgUnit was not found.".into()),
            actor,
        ));
    }
    let (parent_id, parent_external, error) =
        parent(source, department, existing, orgs, departments, planned);
    if mapping.org_unit_id.is_none() {
        if let Some(error) = error {
            return Some(conflict(run, department, error, actor, None));
        }
        let display_order = department
            .display_order
            .unwrap_or_else(|| next_order(orgs, parent_id));
        return Some(diff(
            run,
            department,
            "create_org_unit",
            (None, None),
            json!({"externalDepartmentId":department.external_department_id,"externalParentDepartmentId":department.external_parent_department_id,"externalDepartmentName":department.external_department_name,"targetName":department.external_department_name,"targetCode":external_code(source,&department.external_department_id),"targetParentOrgUnitId":parent_id,"targetParentExternalDepartmentId":parent_external,"displayOrder":display_order,"externalSnapshot":department.raw}),
            None,
            actor,
        ));
    }
    let id = mapping.org_unit_id;
    let Some(org) = orgs.iter().find(|org| Some(org.meta.id) == id) else {
        return Some(conflict(
            run,
            department,
            "Mapped OrgUnit was not found.".into(),
            actor,
            id,
        ));
    };
    if !org.is_active {
        return Some(conflict(
            run,
            department,
            "Mapped OrgUnit is inactive.".into(),
            actor,
            id,
        ));
    }
    if let Some(error) = error {
        return Some(conflict(run, department, error, actor, id));
    }
    if department.external_department_name != org.name {
        return Some(diff(
            run,
            department,
            "update_org_unit",
            (id, Some(org.snapshot())),
            json!({"targetName":department.external_department_name}),
            None,
            actor,
        ));
    }
    if org.parent_id != parent_id
        || department
            .display_order
            .is_some_and(|order| order != org.display_order)
    {
        return Some(diff(
            run,
            department,
            "move_org_unit",
            (id, Some(org.snapshot())),
            json!({"targetParentOrgUnitId":parent_id,"targetParentExternalDepartmentId":parent_external,"displayOrder":department.display_order.unwrap_or(org.display_order)}),
            None,
            actor,
        ));
    }
    None
}
pub fn external_code(source: &Source, external: &str) -> String {
    let provider = if source.provider == "feishu" {
        "FS".into()
    } else {
        source
            .provider
            .to_uppercase()
            .chars()
            .take(6)
            .collect::<String>()
    };
    let mut normalized = String::new();
    for character in external.chars() {
        if character.is_ascii_alphanumeric() {
            normalized.push(character.to_ascii_uppercase());
        } else if !normalized.ends_with('-') {
            normalized.push('-');
        }
    }
    let normalized = normalized.trim_matches('-');
    let normalized = if normalized.is_empty() {
        "DEPT"
    } else {
        normalized
    };
    let digest = openssl::sha::sha1(format!("{}:{external}", source.meta.id).as_bytes());
    let digest = digest[..4]
        .iter()
        .map(|byte| format!("{byte:02X}"))
        .collect::<String>();
    let prefix = format!("EXT-{provider}");
    let length = 64_usize
        .saturating_sub(prefix.len() + digest.len() + 2)
        .max(1);
    format!(
        "{prefix}-{}-{digest}",
        normalized.chars().take(length).collect::<String>()
    )
}
fn next_order(orgs: &[Org], parent: Option<Uuid>) -> f64 {
    orgs.iter()
        .filter(|org| org.parent_id == parent)
        .map(|org| org.display_order)
        .reduce(f64::max)
        .map_or(0.0, |value| value + 1.0)
}
fn key(value: &str) -> Vec<u16> {
    sibling_name_key(&JsString::from_code_units(value.encode_utf16().collect()))
}
fn sibling(
    orgs: &[Org],
    parent: Option<Uuid>,
    name: &str,
    excluded: Option<Uuid>,
) -> Result<(), E> {
    let normalized = key(name);
    if orgs.iter().any(|org| {
        (!org.meta.id.is_nil()).then_some(org.meta.id) != excluded
            && org.parent_id == parent
            && key(&org.name) == normalized
    }) {
        Err(E::Conflict(format!(
            "OrgUnit name {name} already exists under the same parent."
        )))
    } else {
        Ok(())
    }
}
fn code_available(orgs: &[Org], code: &str) -> Result<(), E> {
    let normalized = key(code);
    if orgs.iter().any(|org| key(&org.code) == normalized) {
        Err(E::Conflict(format!("OrgUnit code {code} already exists.")))
    } else {
        Ok(())
    }
}
pub fn descendants(orgs: &[Org], root: Uuid) -> HashSet<Uuid> {
    let mut result = HashSet::new();
    let mut queue = VecDeque::from([root]);
    while let Some(parent) = queue.pop_front() {
        for org in orgs {
            if org.parent_id == Some(parent) && result.insert(org.meta.id) {
                queue.push_back(org.meta.id);
            }
        }
    }
    result
}
pub fn external_id(item: &Diff) -> String {
    text(&item.candidate_snapshot, "externalDepartmentId")
        .unwrap_or_else(|| item.external_department_id.clone())
}
pub fn parent_external(item: &Diff) -> Option<String> {
    if matches!(item.action.as_str(), "create_org_unit" | "move_org_unit") {
        text(&item.candidate_snapshot, "targetParentExternalDepartmentId")
    } else {
        None
    }
}
pub fn selected(item: &Diff, skipped: &HashSet<String>, approved: &HashSet<String>) -> bool {
    !skipped.contains(&item.meta.id.to_string())
        && item.status == "pending"
        && !matches!(item.action.as_str(), "conflict" | "ignore")
        && (approved.is_empty() || approved.contains(&item.meta.id.to_string()))
}
pub fn parent_dependencies(items: &[Diff], mappings: &[Mapping]) -> Result<(), E> {
    let mapped: HashSet<_> = mappings
        .iter()
        .filter(|mapping| mapping.org_unit_id.is_some())
        .map(|mapping| mapping.external_department_id.as_str())
        .collect();
    let created: HashSet<_> = items
        .iter()
        .filter(|item| item.action == "create_org_unit")
        .map(external_id)
        .collect();
    for item in items {
        if let Some(parent) = parent_external(item)
            && !mapped.contains(parent.as_str())
            && !created.contains(&parent)
        {
            return Err(E::BadRequest(format!(
                "Org sync diff item {} requires parent external department {parent} to be mapped or applied in the same request.",
                item.meta.id
            )));
        }
    }
    Ok(())
}
fn by_default(left: &Diff, right: &Diff) -> Ordering {
    left.meta
        .created_at
        .timestamp_millis()
        .cmp(&right.meta.created_at.timestamp_millis())
        .then_with(|| left.meta.id.to_string().cmp(&right.meta.id.to_string()))
}
pub fn apply_order(items: &[Diff], selected: &[Diff]) -> Result<Vec<usize>, E> {
    let mut creates: Vec<_> = selected
        .iter()
        .filter(|item| item.action == "create_org_unit")
        .collect();
    creates.sort_by(|left, right| by_default(left, right));
    let mut by_external = HashMap::new();
    for (item_index, item) in creates.iter().enumerate() {
        let external = external_id(item);
        if by_external.insert(external.clone(), item_index).is_some() {
            return Err(E::BadRequest(format!(
                "Org sync create diff items contain duplicate external department {external}."
            )));
        }
    }
    let mut indegree = vec![0; creates.len()];
    let mut children = vec![Vec::new(); creates.len()];
    for (index, item) in creates.iter().enumerate() {
        if let Some(parent) = parent_external(item)
            && let Some(parent) = by_external.get(&parent)
        {
            indegree[index] += 1;
            children[*parent].push(index);
        }
    }
    let mut queue: VecDeque<_> = indegree
        .iter()
        .enumerate()
        .filter(|(_, degree)| **degree == 0)
        .map(|(index, _)| index)
        .collect();
    let mut sorted = Vec::new();
    while let Some(index) = queue.pop_front() {
        sorted.push(index);
        for child in &children[index] {
            indegree[*child] -= 1;
            if indegree[*child] == 0 {
                queue.push_back(*child);
            }
        }
    }
    if sorted.len() != creates.len() {
        return Err(E::BadRequest(
            "Org sync create diff items contain a circular parent dependency.".into(),
        ));
    }
    let create_index: HashMap<_, _> = sorted
        .iter()
        .enumerate()
        .map(|(rank, index)| (creates[*index].meta.id, rank))
        .collect();
    let rank = |action: &str| match action {
        "create_org_unit" => 10,
        "update_org_unit" => 20,
        "move_org_unit" => 30,
        "disable_org_unit" => 40,
        "map_existing_org_unit" => 50,
        "ignore" => 60,
        "conflict" => 70,
        _ => 99,
    };
    let mut result: Vec<_> = (0..items.len()).collect();
    result.sort_by(|left, right| {
        let (left, right) = (&items[*left], &items[*right]);
        rank(&left.action).cmp(&rank(&right.action)).then_with(|| {
            if left.action == "create_org_unit" {
                match (
                    create_index.get(&left.meta.id),
                    create_index.get(&right.meta.id),
                ) {
                    (Some(left), Some(right)) => left.cmp(right),
                    (Some(_), None) => Ordering::Less,
                    (None, Some(_)) => Ordering::Greater,
                    _ => by_default(left, right),
                }
            } else {
                by_default(left, right)
            }
        })
    });
    Ok(result)
}
pub fn candidate_required(value: &Value, key: &str) -> Result<String, E> {
    candidate_text(value, key)
        .ok_or_else(|| E::BadRequest(format!("Org sync candidate snapshot requires {key}.")))
}
fn candidate_text(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .filter(|value| !crate::auth::cookie::trim_js(value).is_empty())
        .map(str::to_owned)
}
fn candidate_uuid(value: &Value, key: &str) -> Option<Uuid> {
    candidate_text(value, key).and_then(|value| value.parse().ok())
}
fn number(value: &Value, key: &str) -> Option<f64> {
    value
        .get(key)
        .and_then(Value::as_f64)
        .filter(|value| value.is_finite())
}
pub fn mapped_index(item: &Diff, orgs: &[Org]) -> Result<usize, E> {
    let id = item.org_unit_id.ok_or_else(|| {
        E::BadRequest(format!(
            "Org sync diff item {} is not mapped to an OrgUnit.",
            item.meta.id
        ))
    })?;
    orgs.iter()
        .position(|org| org.meta.id == id)
        .ok_or_else(|| E::NotFound(format!("OrgUnit {id} not found")))
}

/// Mutation ordering is deliberately best effort. Persistence owns the final
/// shared flush; this function never starts an item transaction.
pub fn apply_item(
    item: &mut Diff,
    mappings: &mut [Mapping],
    orgs: &mut Vec<Org>,
    created: &mut HashMap<String, Option<Uuid>>,
    actor: Option<Uuid>,
) -> Result<(), E> {
    match item.action.as_str() {
        "create_org_unit" => {
            let candidate = &item.candidate_snapshot;
            let external = candidate_required(candidate, "externalDepartmentId")?;
            let _external_name = candidate_required(candidate, "externalDepartmentName")?;
            let name = candidate_required(candidate, "targetName")?;
            let code = candidate_required(candidate, "targetCode")?;
            let parent = candidate_uuid(candidate, "targetParentOrgUnitId").or_else(|| {
                candidate_text(candidate, "targetParentExternalDepartmentId")
                    .and_then(|parent| created.get(&parent).copied().flatten())
            });
            sibling(orgs, parent, &name, None)?;
            code_available(orgs, &code)?;
            let org = Org {
                meta: Meta::new(actor),
                name,
                code,
                description: None,
                parent_id: parent,
                is_active: true,
                display_order: number(candidate, "displayOrder").unwrap_or(0.0),
            };
            // UUID availability is supplied by the original ORM/PG witness;
            // nil is the request-local representation of an unsaved PK.
            let id = (!org.meta.id.is_nil()).then_some(org.meta.id);
            orgs.push(org);
            created.insert(external.clone(), id);
            item.org_unit_id = id;
            if let Some(id) = id {
                item.candidate_snapshot["appliedOrgUnitId"] = json!(id);
            } else if let Some(object) = item.candidate_snapshot.as_object_mut() {
                object.remove("appliedOrgUnitId");
            }
            item.candidate_snapshot["targetParentOrgUnitId"] = json!(parent);
            let mapping = mappings
                .iter_mut()
                .find(|mapping| mapping.external_department_id == external)
                .ok_or_else(|| {
                    E::NotFound(format!("External department mapping {external} not found"))
                })?;
            mapping.org_unit_id = id;
            mapping.status = "mapped".into();
            mapping.external_snapshot = item.candidate_snapshot["externalSnapshot"]
                .as_object()
                .map(|value| Value::Object(value.clone()))
                .unwrap_or_else(|| json!({}));
            mapping.meta.updated_by = actor;
        }
        "update_org_unit" => {
            let index = mapped_index(item, orgs)?;
            let name = candidate_text(&item.candidate_snapshot, "targetName").ok_or_else(|| {
                E::BadRequest("Update org unit diff item requires targetName.".into())
            })?;
            sibling(
                orgs,
                orgs[index].parent_id,
                &name,
                Some(orgs[index].meta.id),
            )?;
            orgs[index].name = name;
            orgs[index].meta.updated_by = actor;
        }
        "move_org_unit" => {
            let index = mapped_index(item, orgs)?;
            let org = &orgs[index];
            let parent =
                candidate_uuid(&item.candidate_snapshot, "targetParentOrgUnitId").or_else(|| {
                    candidate_text(&item.candidate_snapshot, "targetParentExternalDepartmentId")
                        .and_then(|parent| created.get(&parent).copied().flatten())
                });
            if parent == Some(org.meta.id) {
                return Err(E::Conflict(format!(
                    "OrgUnit {} cannot move under itself.",
                    org.meta.id
                )));
            }
            if parent.is_some_and(|parent| descendants(orgs, org.meta.id).contains(&parent)) {
                return Err(E::Conflict(format!(
                    "OrgUnit {} cannot move under its own descendant.",
                    org.meta.id
                )));
            }
            if let Some(id) = parent {
                let parent = orgs
                    .iter()
                    .find(|org| org.meta.id == id)
                    .ok_or_else(|| E::NotFound(format!("Parent OrgUnit {id} not found")))?;
                if !parent.is_active {
                    return Err(E::Conflict(format!("Parent OrgUnit {id} is inactive")));
                }
            }
            sibling(orgs, parent, &org.name, Some(org.meta.id))?;
            let order =
                number(&item.candidate_snapshot, "displayOrder").unwrap_or(org.display_order);
            orgs[index].parent_id = parent;
            orgs[index].display_order = order;
            orgs[index].meta.updated_by = actor;
        }
        "disable_org_unit" => {
            let index = mapped_index(item, orgs)?;
            let root = orgs[index].meta.id;
            let mut affected = descendants(orgs, root);
            affected.insert(root);
            for org in orgs {
                if affected.contains(&org.meta.id) {
                    org.is_active = false;
                    org.meta.updated_by = actor;
                }
            }
        }
        action => {
            return Err(E::BadRequest(format!(
                "Org sync diff action {action} cannot be applied automatically."
            )));
        }
    }
    Ok(())
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;
    use chrono::{DateTime, Utc};
    fn id(value: &Value, key: &str) -> Option<Uuid> {
        value[key].as_str().and_then(|value| value.parse().ok())
    }
    fn meta(value: &Value) -> Meta {
        let date: DateTime<Utc> = value["createdAt"].as_str().unwrap().parse().unwrap();
        Meta {
            id: id(value, "id").unwrap(),
            row_version: value["rowVersion"].as_i64().unwrap() as i32,
            created_at: date,
            updated_at: value["updatedAt"].as_str().unwrap().parse().unwrap(),
            created_by: id(value, "createdBy"),
            updated_by: id(value, "updatedBy"),
        }
    }
    fn source(value: &Value) -> Source {
        Source {
            meta: meta(value),
            provider: value["provider"].as_str().unwrap().into(),
            external_tenant_id: value["externalTenantId"].as_str().map(str::to_owned),
            display_name: value["displayName"].as_str().unwrap().into(),
            status: value["status"].as_str().unwrap().into(),
            provider_config_id: id(value, "providerConfigId"),
            authoritative_org_unit_id: id(value, "authoritativeOrgUnitId"),
            external_root_department_id: value["externalRootDepartmentId"]
                .as_str()
                .map(str::to_owned),
            sync_scopes: value["syncScopes"].clone(),
        }
    }
    fn run(value: &Value) -> Run {
        Run {
            meta: meta(value),
            source_id: id(value, "sourceId").unwrap(),
            status: value["status"].as_str().unwrap().into(),
            requested_by: None,
            started_at: value["startedAt"].as_str().unwrap().parse().unwrap(),
            finished_at: None,
            total_item_count: 0,
            approved_item_count: 0,
            skipped_item_count: 0,
            failed_item_count: 0,
            error_summary: None,
            request_snapshot: json!({}),
            result_summary: json!({}),
        }
    }
    fn mapping(value: &Value) -> Mapping {
        Mapping {
            meta: meta(value),
            source_id: id(value, "sourceId").unwrap(),
            external_department_id: value["externalDepartmentId"].as_str().unwrap().into(),
            external_parent_department_id: value["externalParentDepartmentId"]
                .as_str()
                .map(str::to_owned),
            external_department_name: value["externalDepartmentName"].as_str().unwrap().into(),
            org_unit_id: id(value, "orgUnitId"),
            status: value["status"].as_str().unwrap().into(),
            external_snapshot: value["externalSnapshot"].clone(),
            last_seen_at: None,
        }
    }
    fn org(value: &Value) -> Org {
        Org {
            meta: meta(value),
            name: value["name"].as_str().unwrap().into(),
            code: value["code"].as_str().unwrap().into(),
            description: None,
            parent_id: id(value, "parentId"),
            is_active: value["isActive"].as_bool().unwrap(),
            display_order: value["displayOrder"].as_f64().unwrap(),
        }
    }
    fn diff_from(value: &Value) -> Diff {
        Diff {
            meta: meta(value),
            run_id: id(value, "runId").unwrap(),
            external_department_id: value["externalDepartmentId"].as_str().unwrap().into(),
            action: value["action"].as_str().unwrap().into(),
            status: value["status"].as_str().unwrap().into(),
            org_unit_id: id(value, "orgUnitId"),
            before_snapshot: (!value["beforeSnapshot"].is_null())
                .then(|| value["beforeSnapshot"].clone()),
            candidate_snapshot: value["candidateSnapshot"].clone(),
            error_message: value["errorMessage"].as_str().map(str::to_owned),
            applied_at: None,
        }
    }
    fn canon(value: Value) -> Value {
        let raw = serde_json::value::to_raw_value(&value).unwrap();
        super::super::validation::node_value(&raw).unwrap()
    }
    #[test]
    fn original_preview_decisions_and_candidate_snapshots() {
        let golden: Value =
            serde_json::from_str(include_str!("../../../../tools/rust-r2gh/h-behavior.json"))
                .unwrap();
        let source = source(&golden["source"]);
        let run = run(&golden["run"]);
        for case in golden["preview"].as_array().unwrap() {
            let input = &case["input"];
            let departments: Vec<ExternalDepartmentSnapshot> =
                serde_json::from_value(input["departments"].clone()).unwrap();
            let mappings: Vec<_> = input["mappings"]
                .as_array()
                .unwrap()
                .iter()
                .map(mapping)
                .collect();
            let orgs: Vec<_> = input["orgUnits"]
                .as_array()
                .unwrap()
                .iter()
                .map(org)
                .collect();
            let actual = preview(&source, &run, &departments, &mappings, &orgs, None);
            let expected = &case["expected"];
            assert_eq!(
                canon(actual.summary),
                expected["summary"],
                "{}",
                input["name"]
            );
            assert_eq!(
                actual.diff_items.len(),
                expected["diffItems"].as_array().unwrap().len()
            );
            for (actual, expected) in actual
                .diff_items
                .iter()
                .zip(expected["diffItems"].as_array().unwrap())
            {
                let mut value = actual.summary();
                for key in [
                    "id",
                    "createdAt",
                    "updatedAt",
                    "createdBy",
                    "updatedBy",
                    "rowVersion",
                ] {
                    value.as_object_mut().unwrap().remove(key);
                }
                let expected = json!({"runId":expected["runId"],"externalDepartmentId":expected["externalDepartmentId"],"action":expected["action"],"status":expected["status"],"orgUnitId":expected["orgUnitId"],"beforeSnapshot":expected["beforeSnapshot"],"candidateSnapshot":expected["candidateSnapshot"],"errorMessage":expected["errorMessage"],"appliedAt":expected["appliedAt"]});
                assert_eq!(canon(value), expected, "{}", input["name"]);
            }
            assert_eq!(
                actual.mappings.len(),
                expected["mappings"].as_array().unwrap().len()
            );
            for (actual, expected) in actual
                .mappings
                .iter()
                .zip(expected["mappings"].as_array().unwrap())
            {
                assert_eq!(
                    json!({"externalDepartmentId":actual.external_department_id,"externalDepartmentName":actual.external_department_name,"externalParentDepartmentId":actual.external_parent_department_id,"orgUnitId":actual.org_unit_id,"status":actual.status,"externalSnapshot":actual.external_snapshot}),
                    json!({"externalDepartmentId":expected["externalDepartmentId"],"externalDepartmentName":expected["externalDepartmentName"],"externalParentDepartmentId":expected["externalParentDepartmentId"],"orgUnitId":expected["orgUnitId"],"status":expected["status"],"externalSnapshot":expected["externalSnapshot"]})
                );
                assert!(actual.last_seen_at.is_some());
            }
        }
        for case in golden["codes"].as_array().unwrap() {
            assert_eq!(
                external_code(&source, case["externalDepartmentId"].as_str().unwrap()),
                case["expected"].as_str().unwrap()
            );
        }
    }
    #[test]
    fn original_approval_dependency_and_topological_order() {
        let source: Value =
            serde_json::from_str(include_str!("../../../../tools/rust-r2gh/h-behavior.json"))
                .unwrap();
        for case in source["selection"].as_array().unwrap() {
            let item = diff_from(&case["item"]);
            let skipped = case["skipped"]
                .as_array()
                .unwrap()
                .iter()
                .map(|value| value.as_str().unwrap().to_owned())
                .collect();
            let approved = case["approved"]
                .as_array()
                .unwrap()
                .iter()
                .map(|value| value.as_str().unwrap().to_owned())
                .collect();
            assert_eq!(
                selected(&item, &skipped, &approved),
                case["expected"].as_bool().unwrap()
            );
        }
        for case in source["orders"].as_array().unwrap() {
            let items = case["items"]
                .as_array()
                .unwrap()
                .iter()
                .map(diff_from)
                .collect::<Vec<_>>();
            match apply_order(&items, &items) {
                Ok(order) => assert_eq!(
                    json!(
                        order
                            .into_iter()
                            .map(|index| items[index].meta.id.to_string())
                            .collect::<Vec<_>>()
                    ),
                    case["expected"]
                ),
                Err(error) => assert_eq!(
                    error.to_string(),
                    case["error"]["message"].as_str().unwrap()
                ),
            }
        }
        for case in source["dependencies"].as_array().unwrap() {
            let items = case["items"]
                .as_array()
                .unwrap()
                .iter()
                .map(diff_from)
                .collect::<Vec<_>>();
            let mappings = case["mappings"]
                .as_array()
                .unwrap()
                .iter()
                .map(mapping)
                .collect::<Vec<_>>();
            match parent_dependencies(&items, &mappings) {
                Ok(()) => assert_eq!(case["expected"], true),
                Err(error) => assert_eq!(
                    error.to_string(),
                    case["error"]["message"].as_str().unwrap()
                ),
            }
        }
    }
    #[test]
    fn unassigned_generated_pk_does_not_backfill_original_undefined_relations() {
        let source: Value =
            serde_json::from_str(include_str!("../../../../tools/rust-r2gh/h-behavior.json"))
                .unwrap();
        let case = &source["unassignedPk"];
        let mut items = case["items"]
            .as_array()
            .unwrap()
            .iter()
            .map(diff_from)
            .collect::<Vec<_>>();
        let mut mappings = case["mappings"]
            .as_array()
            .unwrap()
            .iter()
            .map(mapping)
            .collect::<Vec<_>>();
        let mut orgs = Vec::new();
        let mut created = HashMap::new();
        for item in &mut items {
            apply_item(item, &mut mappings, &mut orgs, &mut created, None).unwrap();
        }
        assert_eq!(orgs.len(), 2);
        for (org, expected) in orgs.iter().zip(case["orgUnits"].as_array().unwrap()) {
            assert!(org.meta.id.is_nil());
            assert_eq!(
                canon(
                    json!({"name":org.name,"code":org.code,"parentId":org.parent_id,"isActive":org.is_active,"displayOrder":org.display_order})
                ),
                json!({"name":expected["name"],"code":expected["code"],"parentId":expected["parentId"],"isActive":expected["isActive"],"displayOrder":expected["displayOrder"]})
            );
        }
        assert!(orgs[0].parent_id.is_some());
        assert!(orgs[1].parent_id.is_none());
        assert!(items.iter().all(|item| item.org_unit_id.is_none()
            && item.candidate_snapshot.get("appliedOrgUnitId").is_none()));
        assert!(
            mappings
                .iter()
                .all(|mapping| mapping.org_unit_id.is_none() && mapping.status == "mapped")
        );
        assert!(created.values().all(Option::is_none));
    }
}
