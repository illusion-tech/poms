//! K5 public-entry behavior. AUTO/SQL scheduling is calibrated by the native K witness.
use super::*;
use crate::{
    auth::js_json::{JsObject, decode_string},
    handover_facts::{HandoverFact, ProjectFact},
};
use icu_collator::{
    Collator, CollatorPreferences,
    options::{AlternateHandling, CaseLevel, CollatorOptions, Strength},
    preferences::{CollationCaseFirst, CollationNumericOrdering},
};
use std::sync::OnceLock;

struct Candidate {
    attachment: usize,
    source_refs: Vec<Wire>,
    status: &'static str,
    reason: &'static str,
    exclusion: Option<String>,
}
struct Source {
    kind: &'static str,
    id: String,
    label: String,
}
fn string(value: Option<JsString>) -> Wire {
    Wire(value.map_or_else(|| "null".into(), |value| value.json()))
}
fn field(entity: &Entity, key: &str) -> Wire {
    string(entity.string(key))
}
fn allowed(entity: &Entity) -> bool {
    matches!(entity.str("security_level"), "normal" | "internal")
}
fn eligible(entity: &Entity) -> bool {
    entity.str("status") == "included" && !entity.str("attachment_id").is_empty() && allowed(entity)
}
fn iso() -> Value {
    json!(crate::compat::scalars::js_iso_string(clock_now()).unwrap_or_default())
}
fn ref_text(raw: &Wire, key: &str) -> String {
    JsObject::parse(&raw.0)
        .ok()
        .and_then(|value| value.get(key))
        .and_then(|value| decode_string(value.get()).ok())
        .map(|value| value.to_utf8_lossy())
        .unwrap_or_default()
}
fn merge_refs(left: &mut Vec<Wire>, right: Vec<Wire>) {
    for value in right {
        let key = |value: &Wire| {
            format!(
                "{}:{}:{}",
                ref_text(value, "sourceType"),
                ref_text(value, "sourceId"),
                ref_text(value, "relationType")
            )
        };
        if let Some(index) = left.iter().position(|old| key(old) == key(&value)) {
            left[index] = value;
        } else {
            left.push(value);
        }
    }
}
fn source_refs(links: &[Entity], source: &Source) -> Vec<Wire> {
    let matches = links
        .iter()
        .filter(|link| link.str("target_type") == source.kind && link.str("target_id") == source.id)
        .map(Some)
        .collect::<Vec<_>>();
    let matches = if matches.is_empty() {
        vec![None]
    } else {
        matches
    };
    matches
        .into_iter()
        .map(|link| {
            Wire::ordered([
                ("sourceType", Wire::value(json!(source.kind))),
                ("sourceId", Wire::value(json!(source.id))),
                (
                    "relationType",
                    Wire::value(json!(link.and_then(|link| link.text("relation_type")))),
                ),
                ("label", Wire::value(json!(source.label))),
            ])
        })
        .collect()
}
fn name_collator() -> Result<&'static Collator> {
    static COLLATOR: OnceLock<std::result::Result<Collator, String>> = OnceLock::new();
    COLLATOR
        .get_or_init(|| {
            let locale: icu_locale_core::Locale = "zh-CN"
                .parse()
                .map_err(|_| "invalid fixed K locale".to_owned())?;
            let mut preferences: CollatorPreferences = locale.into();
            preferences.case_first = Some(CollationCaseFirst::False);
            preferences.numeric_ordering = Some(CollationNumericOrdering::False);
            let mut options = CollatorOptions::default();
            options.strength = Some(Strength::Tertiary);
            options.alternate_handling = Some(AlternateHandling::NonIgnorable);
            options.case_level = Some(CaseLevel::Off);
            Collator::try_new_unstable(&crate::roles::collation::NodeData, preferences, options)
                .map_err(|_| "invalid fixed K collation data".to_owned())
        })
        .as_ref()
        .map_err(StorageFailure::unexpected)
}
fn selection_item(selection: &Entity) -> Wire {
    Wire::ordered([
        ("selectionId", field(selection, "id")),
        ("handoverId", field(selection, "handover_id")),
        ("projectId", field(selection, "project_id")),
        ("attachmentId", field(selection, "attachment_id")),
        ("versionGroupId", field(selection, "version_group_id")),
        ("displayName", field(selection, "display_name")),
        ("category", field(selection, "category")),
        ("securityLevel", field(selection, "security_level")),
        ("status", field(selection, "status")),
        ("selectionReason", field(selection, "selection_reason")),
        ("exclusionReason", field(selection, "exclusion_reason")),
        ("downloadEligible", Wire::value(json!(eligible(selection)))),
        (
            "staleVersion",
            Wire::value(json!(selection.str("status") == "stale-version")),
        ),
        ("sourceRefs", selection.json_wire("source_refs")),
        ("rowVersion", Wire::value(json!(selection.version()))),
        ("updatedAt", Wire::value(date(selection, "updated_at"))),
    ])
}
fn candidate_item(handover: &HandoverFact, candidate: &Candidate, attachment: &Entity) -> Wire {
    Wire::ordered([
        ("selectionId", Wire::value(Value::Null)),
        ("handoverId", Wire::value(json!(handover.id))),
        ("projectId", Wire::value(json!(handover.project_id))),
        ("attachmentId", field(attachment, "id")),
        ("versionGroupId", Wire::value(json!(group_id(attachment)))),
        ("displayName", field(attachment, "display_name")),
        ("category", field(attachment, "category")),
        ("securityLevel", field(attachment, "security_level")),
        ("status", Wire::value(json!(candidate.status))),
        ("selectionReason", Wire::value(json!(candidate.reason))),
        ("exclusionReason", Wire::value(json!(candidate.exclusion))),
        (
            "downloadEligible",
            Wire::value(json!(candidate.status == "included")),
        ),
        ("staleVersion", Wire::value(json!(false))),
        ("sourceRefs", Wire::array(candidate.source_refs.clone())),
        ("rowVersion", Wire::value(Value::Null)),
        ("updatedAt", Wire::value(Value::Null)),
    ])
}
fn checklist(handover: &HandoverFact, items: Vec<Wire>) -> Result<Wire> {
    let count = |status: &str| {
        items
            .iter()
            .filter(|item| ref_text(item, "status") == status)
            .count()
    };
    let downloadable = items
        .iter()
        .filter(|item| {
            JsObject::parse(&item.0)
                .ok()
                .and_then(|object| object.get("downloadEligible"))
                .is_some_and(|raw| raw.get() == "true")
        })
        .count();
    zip::compact_json(&Wire::ordered([
        ("handoverId", Wire::value(json!(handover.id))),
        ("projectId", Wire::value(json!(handover.project_id))),
        ("generatedAt", Wire::value(iso())),
        (
            "counts",
            Wire::ordered([
                ("total", Wire::value(json!(items.len()))),
                ("included", Wire::value(json!(count("included")))),
                ("missing", Wire::value(json!(count("missing")))),
                ("excluded", Wire::value(json!(count("excluded")))),
                (
                    "sensitiveExcluded",
                    Wire::value(json!(count("sensitive-excluded"))),
                ),
                ("staleVersion", Wire::value(json!(count("stale-version")))),
                ("downloadable", Wire::value(json!(downloadable))),
            ]),
        ),
        ("items", Wire::array(items)),
    ]))
}
fn package_summary(row: &Entity) -> Result<Wire> {
    zip::compact_json(&Wire::ordered([
        ("id", field(row, "id")),
        ("handoverId", field(row, "handover_id")),
        ("projectId", field(row, "project_id")),
        ("status", field(row, "status")),
        ("manifestSummary", row.json_wire("manifest_summary")),
        ("fileName", field(row, "file_name")),
        ("expiresAt", Wire::value(date(row, "expires_at"))),
        ("createdBy", field(row, "created_by")),
        ("createdAt", Wire::value(date(row, "created_at"))),
        ("downloadedAt", Wire::value(date(row, "downloaded_at"))),
        (
            "downloadCount",
            Wire::value(json!(row.integer("download_count"))),
        ),
        ("failedReason", field(row, "failed_reason")),
    ]))
}
fn manifest_summary(included: &[Entity], excluded: &[Entity]) -> Wire {
    let ids = |rows: &[Entity]| {
        rows.iter()
            .filter_map(|row| row.text("attachment_id").filter(|value| !value.is_empty()))
            .collect::<Vec<_>>()
    };
    let mut reasons = Vec::new();
    for row in excluded {
        let reason = row
            .string("exclusion_reason")
            .unwrap_or_else(|| js(row.str("status")));
        if !reasons.contains(&reason) {
            reasons.push(reason);
        }
    }
    Wire::ordered([
        ("includedCount", Wire::value(json!(included.len()))),
        ("excludedCount", Wire::value(json!(excluded.len()))),
        ("includedAttachmentIds", Wire::value(json!(ids(included)))),
        ("excludedAttachmentIds", Wire::value(json!(ids(excluded)))),
        (
            "excludedReasons",
            Wire::array(
                reasons
                    .into_iter()
                    .map(|value| Wire(value.json()))
                    .collect(),
            ),
        ),
    ])
}
fn manifest(package: &Entity, included: &[Entity], summary: Wire) -> Wire {
    let items = included
        .iter()
        .enumerate()
        .map(|(index, selection)| {
            Wire::ordered([
                ("selectionId", field(selection, "id")),
                ("attachmentId", field(selection, "attachment_id")),
                ("versionGroupId", field(selection, "version_group_id")),
                ("displayName", field(selection, "display_name")),
                ("category", field(selection, "category")),
                ("securityLevel", field(selection, "security_level")),
                (
                    "fileName",
                    Wire(
                        zip::entry_name(
                            &selection.string("display_name").unwrap_or_else(|| js("")),
                            index,
                        )
                        .json(),
                    ),
                ),
                ("sourceRefs", selection.json_wire("source_refs")),
            ])
        })
        .collect();
    Wire::ordered([
        ("packageId", field(package, "id")),
        ("handoverId", field(package, "handover_id")),
        ("projectId", field(package, "project_id")),
        ("createdAt", Wire::value(date(package, "created_at"))),
        ("expiresAt", Wire::value(date(package, "expires_at"))),
        ("manifestSummary", summary),
        ("items", Wire::array(items)),
    ])
}

impl AttachmentsService {
    async fn handover_context(
        &self,
        id: &str,
        mode: &str,
        ctx: &CallContext,
    ) -> Result<(HandoverFact, ProjectFact)> {
        if !ctx.permission(&format!("project:{mode}")) {
            return Err(forbidden(format!("Missing project {mode} permission")));
        }
        let handover = self
            .facts
            .find_handover(id)
            .await?
            .ok_or_else(|| missing(format!("Project handover {id} not found")))?;
        let project = self
            .facts
            .find_project(&handover.project_id)
            .await?
            .ok_or_else(|| missing(format!("Project {} not found", handover.project_id)))?;
        Ok((handover, project))
    }
    /// Query metadata, not unrelated reads, determines the original AUTO flush.
    /// The native K trace remains the authority for its final scheduling points.
    async fn k_rows(
        &self,
        table: Table,
        filter: store::ReadFilter,
        params: Vec<String>,
        ctx: &mut CallContext,
    ) -> Result<Vec<usize>> {
        if ctx
            .entities
            .iter()
            .any(|entity| entity.table == table && entity.original.is_none())
        {
            self.save(ctx).await?;
        }
        Ok(store::rows(&self.database, table, filter, params)
            .await?
            .into_iter()
            .map(|row| ctx.track(row))
            .collect())
    }
    async fn collect_handover_candidates(
        &self,
        handover: &HandoverFact,
        project: &ProjectFact,
        ctx: &mut CallContext,
    ) -> Result<Vec<Candidate>> {
        let (contracts, followups) = tokio::try_join!(
            self.facts.find_contracts_by_project(&handover.project_id),
            self.facts.find_followups_for_sources(
                &handover.project_id,
                project.source_lead_id.as_deref()
            )
        )?;
        let mut sources = vec![Source {
            kind: "project",
            id: project.id.clone(),
            label: "项目附件".into(),
        }];
        if let Some(id) = project
            .source_lead_id
            .as_ref()
            .filter(|value| !value.is_empty())
        {
            sources.push(Source {
                kind: "lead",
                id: id.clone(),
                label: "来源线索附件".into(),
            });
        }
        sources.extend(contracts.into_iter().map(|contract| Source {
            kind: "contract",
            id: contract.id,
            label: format!("合同 {}", contract.contract_no),
        }));
        sources.extend(followups.into_iter().map(|followup| Source {
            kind: "sales-follow-up",
            id: followup.id,
            label: "销售跟进附件".into(),
        }));
        sources.push(Source {
            kind: "project-handover",
            id: handover.id.clone(),
            label: "已纳入移交附件".into(),
        });
        let mut candidates: Vec<Candidate> = Vec::new();
        for source in sources {
            let links = self
                .k_rows(
                    Table::Link,
                    store::ReadFilter::LinksByTarget,
                    vec![source.kind.into(), source.id.clone()],
                    ctx,
                )
                .await?;
            let mut ids = Vec::new();
            for index in links {
                let id = ctx.entities[index].str("attachment_id").to_owned();
                if !ids.contains(&id) {
                    ids.push(id);
                }
            }
            if ids.is_empty() {
                continue;
            }
            let rows = store::attachments(&self.database, ids, None, "active".into()).await?;
            let attachments = rows
                .into_iter()
                .map(|row| ctx.track(row))
                .collect::<Vec<_>>();
            let all_links = store::all_active_links(
                &self.database,
                attachments
                    .iter()
                    .map(|&index| ctx.entities[index].id())
                    .collect(),
            )
            .await?;
            let all_links = all_links
                .into_iter()
                .map(|row| {
                    let index = ctx.track(row);
                    ctx.entities[index].clone()
                })
                .collect::<Vec<_>>();
            for index in attachments {
                let original_id = ctx.entities[index].id();
                let links = all_links
                    .iter()
                    .filter(|link| link.str("attachment_id") == original_id)
                    .cloned()
                    .collect::<Vec<_>>();
                let group = group_id(&ctx.entities[index]);
                let final_rows = self
                    .k_rows(
                        Table::Attachment,
                        store::ReadFilter::Final,
                        vec![group],
                        ctx,
                    )
                    .await?;
                let resolved = final_rows.first().copied().unwrap_or(index);
                let reason = if !final_rows.is_empty() || ctx.entities[index].boolean("is_final") {
                    "final"
                } else {
                    "latest-no-final"
                };
                let refs = source_refs(&links, &source);
                let group = group_id(&ctx.entities[resolved]);
                if let Some(existing) = candidates
                    .iter_mut()
                    .find(|candidate| group_id(&ctx.entities[candidate.attachment]) == group)
                {
                    merge_refs(&mut existing.source_refs, refs);
                    continue;
                }
                let attachment = &ctx.entities[resolved];
                candidates.push(Candidate { attachment: resolved, source_refs: refs, reason, status: if allowed(attachment) { "included" } else { "sensitive-excluded" }, exclusion: (!allowed(attachment)).then(|| format!("Security level {} is excluded from ordinary handover download packages", attachment.str("security_level"))) });
            }
        }
        let collator = name_collator()?.as_borrowed();
        candidates.sort_by(|left, right| {
            collator.compare(
                ctx.entities[left.attachment].str("display_name"),
                ctx.entities[right.attachment].str("display_name"),
            )
        });
        Ok(candidates)
    }
    async fn k_audit(
        &self,
        event: &str,
        target: &str,
        result: &str,
        metadata: Wire,
        request_id: Option<&str>,
        ctx: &mut CallContext,
    ) -> Result<()> {
        let audit = AuditWrite {
            event: event.into(),
            target: target.into(),
            result: result.into(),
            metadata,
            request_id: request_id.map(str::to_owned),
            operator: ctx.session.user.user_id,
        };
        store::flush(
            &self.database,
            &mut ctx.entities,
            &mut ctx.pending,
            Some(audit),
        )
        .await
    }
    pub async fn handover_checklist(
        &self,
        id: &str,
        request_id: Option<&str>,
        ctx: &mut CallContext,
    ) -> Result<Wire> {
        let (handover, project) = self.handover_context(id, "read", ctx).await?;
        let rows = self
            .k_rows(
                Table::HandoverSelection,
                store::ReadFilter::HandoverSelections,
                vec![id.into()],
                ctx,
            )
            .await?;
        self.k_audit(
            "attachment.handover_checklist_viewed",
            id,
            "success",
            Wire::value(json!({"projectId":handover.project_id,"selectionCount":rows.len()})),
            request_id,
            ctx,
        )
        .await?;
        let items = if rows.is_empty() {
            self.collect_handover_candidates(&handover, &project, ctx)
                .await?
                .iter()
                .map(|candidate| {
                    candidate_item(&handover, candidate, &ctx.entities[candidate.attachment])
                })
                .collect()
        } else {
            rows.iter()
                .map(|&index| selection_item(&ctx.entities[index]))
                .collect()
        };
        checklist(&handover, items)
    }
    async fn refresh_handover_rows(
        &self,
        id: &str,
        preserve: bool,
        request_id: Option<&str>,
        ctx: &mut CallContext,
    ) -> Result<(HandoverFact, Vec<usize>)> {
        let (handover, project) = self.handover_context(id, "write", ctx).await?;
        let (existing, candidates) = tokio::try_join!(
            store::rows(
                &self.database,
                Table::HandoverSelection,
                store::ReadFilter::HandoverSelections,
                vec![id.into()]
            ),
            self.collect_handover_candidates(&handover, &project, ctx)
        )?;
        let mut by_group = HashMap::new();
        for row in existing {
            let index = ctx.track(row);
            if !ctx.entities[index].str("version_group_id").is_empty() {
                by_group.insert(
                    ctx.entities[index].str("version_group_id").to_owned(),
                    index,
                );
            }
        }
        let mut refreshed = Vec::new();
        for candidate in candidates {
            let attachment = ctx.entities[candidate.attachment].clone();
            let group = group_id(&attachment);
            let existing = by_group.get(&group).copied();
            let index = if let Some(index) = existing {
                index
            } else {
                let now = clock_now();
                let selection = Entity::new(
                    Table::HandoverSelection,
                    json!({"id":uuid()?,"handover_id":handover.id,"project_id":handover.project_id,"created_by":ctx.user_id(),"updated_by":ctx.user_id(),"created_at":now,"updated_at":clock_now()}),
                );
                ctx.entities.push(selection);
                ctx.entities.len() - 1
            };
            if existing.is_none() || !preserve || ctx.entities[index].str("status") != "excluded" {
                let selection = &mut ctx.entities[index];
                for key in ["display_name", "category", "security_level"] {
                    selection.set_text(key, attachment.string(key));
                }
                selection.set("attachment_id", json!(attachment.id()));
                selection.set("version_group_id", json!(group));
                selection.set("status", json!(candidate.status));
                selection.set("selection_reason", json!(candidate.reason));
                selection.set("exclusion_reason", json!(candidate.exclusion));
                selection.set_json("source_refs", Wire::array(candidate.source_refs))?;
                selection.set("updated_by", json!(ctx.session.user.user_id));
            }
            refreshed.push(index);
            let attachment_id = ctx.entities[index].text("attachment_id");
            if ctx.entities[index].str("status") == "included"
                && let Some(attachment_id) = attachment_id.filter(|value| !value.is_empty())
            {
                let rows = self
                    .k_rows(
                        Table::Link,
                        store::ReadFilter::ExistingLink,
                        vec![
                            attachment_id.clone(),
                            "project-handover".into(),
                            handover.id.clone(),
                            "handover".into(),
                        ],
                        ctx,
                    )
                    .await?;
                if rows.is_empty() {
                    let link = Entity::new(
                        Table::Link,
                        json!({"attachment_id":attachment_id,"target_type":"project-handover","target_id":handover.id,"relation_type":"handover","status":"active","linked_by":ctx.user_id(),"linked_at":clock_now()}),
                    );
                    ctx.entities.push(link);
                }
            }
        }
        self.save(ctx).await?;
        let included = refreshed
            .iter()
            .filter(|&&index| ctx.entities[index].str("status") == "included")
            .count();
        self.k_audit("attachment.handover_checklist_refreshed", id, "success", Wire::value(json!({"projectId":handover.project_id,"refreshedCount":refreshed.len(),"includedCount":included})), request_id, ctx).await?;
        Ok((handover, refreshed))
    }
    pub async fn refresh_handover_checklist(
        &self,
        id: &str,
        input: &RequestData,
        request_id: Option<&str>,
        ctx: &mut CallContext,
    ) -> Result<Wire> {
        let (handover, rows) = self
            .refresh_handover_rows(
                id,
                input.boolean("preserveManualExclusions").unwrap_or(true),
                request_id,
                ctx,
            )
            .await?;
        checklist(
            &handover,
            rows.iter()
                .map(|&index| selection_item(&ctx.entities[index]))
                .collect(),
        )
    }
    pub async fn create_handover_download_package(
        &self,
        id: &str,
        input: &RequestData,
        request_id: Option<&str>,
        ctx: &mut CallContext,
    ) -> Result<Wire> {
        let (handover, project) = self.handover_context(id, "read", ctx).await?;
        let mut selections = self
            .k_rows(
                Table::HandoverSelection,
                store::ReadFilter::HandoverSelections,
                vec![id.into()],
                ctx,
            )
            .await?;
        if selections.is_empty() {
            let (_, rows) = self
                .refresh_handover_rows(id, true, request_id, ctx)
                .await?;
            if !rows.is_empty() {
                let ids = rows
                    .iter()
                    .map(|&index| ctx.entities[index].id())
                    .collect::<Vec<_>>();
                selections = self
                    .k_rows(
                        Table::HandoverSelection,
                        store::ReadFilter::HandoverSelectionIds,
                        vec![format!("{{{}}}", ids.join(","))],
                        ctx,
                    )
                    .await?;
            }
        }
        let selected = if let Some(raw) = input.array("selectionIds") {
            let ids = raw
                .into_iter()
                .map(|raw| {
                    decode_string(raw.get())
                        .map(|value| value.to_utf8_lossy())
                        .map_err(|_| StorageFailure::internal())
                })
                .collect::<Result<HashSet<_>>>()?;
            let selected = selections
                .iter()
                .copied()
                .filter(|&index| ids.contains(&ctx.entities[index].id()))
                .collect::<Vec<_>>();
            if selected.len() != ids.len() {
                return Err(bad(
                    "Some attachment checklist selections do not exist for this handover",
                ));
            }
            selected
        } else {
            selections.clone()
        };
        for expectation in input.array("expectedSelectionVersions").unwrap_or_default() {
            let object =
                JsObject::parse(expectation.get()).map_err(|_| StorageFailure::internal())?;
            let selection_id = object
                .get("selectionId")
                .and_then(|raw| decode_string(raw.get()).ok())
                .map(|value| value.to_utf8_lossy())
                .unwrap_or_default();
            let index = selected
                .iter()
                .copied()
                .find(|&index| ctx.entities[index].id() == selection_id)
                .ok_or_else(|| {
                    bad(format!(
                        "Attachment selection {selection_id} is not part of this package request"
                    ))
                })?;
            let version: f64 = object
                .get("rowVersion")
                .and_then(|raw| raw.get().parse().ok())
                .unwrap_or(f64::NAN);
            if ctx.entities[index].version() as f64 != version {
                return Err(conflict(format!(
                    "Attachment selection {selection_id} version mismatch"
                )));
            }
        }
        let included = selected
            .iter()
            .map(|&index| &ctx.entities[index])
            .filter(|row| eligible(row))
            .cloned()
            .collect::<Vec<_>>();
        let excluded = selections
            .iter()
            .map(|&index| &ctx.entities[index])
            .filter(|row| row.str("status") != "included")
            .cloned()
            .collect::<Vec<_>>();
        if included.is_empty() {
            return Err(bad(
                "No downloadable handover attachment selections are available",
            ));
        }
        if input.boolean("confirmedSensitiveExclusion") == Some(false)
            && excluded
                .iter()
                .any(|row| row.str("status") == "sensitive-excluded")
        {
            return Err(bad(
                "Sensitive exclusions must be confirmed before creating a handover package",
            ));
        }
        let now = clock_now();
        let package_id = uuid()?;
        let summary = manifest_summary(&included, &excluded);
        let mut package = Entity::new(
            Table::DownloadPackage,
            json!({"id":package_id,"handover_id":handover.id,"project_id":handover.project_id,"status":"running","storage_provider":null,"storage_bucket":null,"storage_key":null,"file_name":zip::package_file_name(&handover.id),"expires_at":now+Duration::hours(24),"created_by":ctx.user_id(),"created_at":now,"updated_at":now,"downloaded_at":null,"download_count":0,"failed_reason":null}),
        );
        package.set_json("manifest_summary", summary.clone())?;
        ctx.entities.push(package);
        let package_index = ctx.entities.len() - 1;
        for (index, selection) in included.iter().enumerate() {
            let mut item = Entity::new(
                Table::DownloadPackageItem,
                json!({"package_id":package_id,"handover_id":handover.id,"attachment_id":selection.data["attachment_id"],"version_group_id":selection.data["version_group_id"],"status":"included","exclusion_reason":null,"created_at":clock_now()}),
            );
            item.set_json("source_refs", selection.json_wire("source_refs"))?;
            item.set_text(
                "file_name",
                Some(zip::entry_name(
                    &selection.string("display_name").unwrap_or_else(|| js("")),
                    index,
                )),
            );
            ctx.entities.push(item);
        }
        for selection in &excluded {
            let mut item = Entity::new(
                Table::DownloadPackageItem,
                json!({"package_id":package_id,"handover_id":handover.id,"attachment_id":selection.data["attachment_id"],"version_group_id":selection.data["version_group_id"],"status":"excluded","file_name":null,"created_at":clock_now()}),
            );
            item.set_text(
                "exclusion_reason",
                Some(
                    selection
                        .string("exclusion_reason")
                        .unwrap_or_else(|| js(selection.str("status"))),
                ),
            );
            item.set_json("source_refs", selection.json_wire("source_refs"))?;
            ctx.entities.push(item);
        }
        let generation: Result<ObjectLocation> = async {
            let mut entries = vec![zip::Entry {
                name: js("manifest.json"),
                data: zip::pretty_json(&manifest(
                    &ctx.entities[package_index],
                    &included,
                    summary,
                ))?,
            }];
            for (index, selection) in included.iter().enumerate() {
                let Some(id) = selection
                    .text("attachment_id")
                    .filter(|value| !value.is_empty())
                else {
                    continue;
                };
                let attachment = self.load(Table::Attachment, &id, ctx).await?;
                let bytes = self
                    .storage
                    .read_buffer(&location(&ctx.entities[attachment]))
                    .await?;
                entries.push(zip::Entry {
                    name: zip::entry_name(
                        &selection.string("display_name").unwrap_or_else(|| js("")),
                        index,
                    ),
                    data: bytes,
                });
            }
            let archive = zip::build(&entries, clock_now())?;
            self.storage
                .save_download_package(
                    &package_id,
                    ctx.entities[package_index].str("file_name"),
                    &archive,
                    Some(now),
                )
                .await
        }
        .await;
        match generation {
            Ok(stored) => {
                let package = &mut ctx.entities[package_index];
                package.set("status", json!("ready"));
                package.set("storage_provider", json!(stored.storage_provider));
                package.set("storage_bucket", json!(stored.storage_bucket));
                package.set("storage_key", json!(stored.storage_key));
            }
            Err(error) => {
                let package = &mut ctx.entities[package_index];
                package.set("status", json!("failed"));
                package.set_text("failed_reason", Some(error.message));
            }
        }
        self.save(ctx).await?;
        let result = if ctx.entities[package_index].str("status") == "ready" {
            "success"
        } else {
            "failed"
        };
        self.k_audit("attachment.batch_package_created", &package_id, result, Wire::value(json!({"projectId":project.id,"projectHandoverId":handover.id,"packageId":package_id,"attachmentIds":included.iter().filter_map(|row|row.text("attachment_id")).collect::<Vec<_>>(),"excludedAttachmentIds":excluded.iter().filter_map(|row|row.text("attachment_id")).collect::<Vec<_>>()})), request_id, ctx).await?;
        package_summary(&ctx.entities[package_index])
    }
    async fn accessible_package(&self, id: &str, ctx: &mut CallContext) -> Result<usize> {
        let index = self.load(Table::DownloadPackage, id, ctx).await?;
        self.handover_context(ctx.entities[index].str("handover_id"), "read", ctx)
            .await?;
        Ok(index)
    }
    pub async fn get_download_package(&self, id: &str, ctx: &mut CallContext) -> Result<Wire> {
        let index = self.accessible_package(id, ctx).await?;
        package_summary(&ctx.entities[index])
    }
    pub async fn download_package(
        &self,
        id: &str,
        request_id: Option<&str>,
        ctx: &mut CallContext,
    ) -> Result<BinaryPayload> {
        let index = self.accessible_package(id, ctx).await?;
        let metadata = Wire::value(
            json!({"projectId":ctx.entities[index].data["project_id"],"projectHandoverId":ctx.entities[index].data["handover_id"],"packageId":id}),
        );
        if ctx.entities[index].str("status") == "ready"
            && ctx.entities[index]
                .time("expires_at")
                .is_some_and(|date| date <= clock_now())
        {
            ctx.entities[index].set("status", json!("expired"));
            self.save(ctx).await?;
            self.k_audit(
                "attachment.batch_package_expired",
                id,
                "rejected",
                metadata,
                request_id,
                ctx,
            )
            .await?;
            return Err(conflict(format!(
                "Attachment download package {id} has expired"
            )));
        }
        if ctx.entities[index].str("status") != "ready"
            || ctx.entities[index].str("storage_key").is_empty()
        {
            return Err(conflict(format!(
                "Attachment download package {id} is not ready"
            )));
        }
        let stored = ObjectLocation {
            storage_provider: ctx.entities[index]
                .text("storage_provider")
                .unwrap_or_else(|| "local".into()),
            storage_bucket: ctx.entities[index].text("storage_bucket"),
            storage_key: ctx.entities[index].str("storage_key").into(),
        };
        let body = self.storage.open_read_stream(&stored).await?;
        let count = ctx.entities[index].integer("download_count") + 1;
        ctx.entities[index].set("downloaded_at", json!(clock_now()));
        ctx.entities[index].set("download_count", json!(count));
        self.save(ctx).await?;
        let metadata = Wire::value(
            json!({"projectId":ctx.entities[index].data["project_id"],"projectHandoverId":ctx.entities[index].data["handover_id"],"packageId":id,"downloadCount":count}),
        );
        self.k_audit(
            "attachment.batch_package_downloaded",
            id,
            "success",
            metadata,
            request_id,
            ctx,
        )
        .await?;
        Ok(BinaryPayload {
            body,
            mime: js("application/zip"),
            filename: ctx.entities[index]
                .string("file_name")
                .unwrap_or_else(|| js(&format!("{}.zip", ctx.entities[index].id()))),
            inline: false,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn manifest_matches_original_extracted_prefix_and_json_order() {
        let golden: Value =
            serde_json::from_str(include_str!("../../../../tools/rust-r2k/k-zip-golden.json"))
                .unwrap_or_else(|_| panic!("K helper golden"));
        let original = &golden["manifest"];
        let package = &original["packageRow"];
        let package = Entity::loaded(
            Table::DownloadPackage,
            json!({"id":package["id"],"handover_id":package["handoverId"],"project_id":package["projectId"],"created_at":package["createdAt"],"expires_at":package["expiresAt"]}),
        );
        let included = original["included"].as_array().into_iter().flatten().map(|row| {
            let mut entity = Entity::loaded(Table::HandoverSelection, json!({"id":row["id"],"attachment_id":row["attachmentId"],"version_group_id":row["versionGroupId"],"display_name":row["displayName"],"category":row["category"],"security_level":row["securityLevel"]}));
            let source = &row["sourceRefs"][0];
            entity.set_json("source_refs", Wire::array(vec![Wire::ordered([("sourceType", Wire::value(source["sourceType"].clone())), ("sourceId", Wire::value(source["sourceId"].clone())), ("relationType", Wire::value(source["relationType"].clone())), ("label", Wire::value(source["label"].clone()))])])).unwrap_or_else(|_| panic!("source refs")); entity
        }).collect::<Vec<_>>();
        let excluded = original["excluded"].as_array().into_iter().flatten().map(|row| Entity::loaded(Table::HandoverSelection, json!({"attachment_id":row["attachmentId"],"status":row["status"],"exclusion_reason":row["exclusionReason"]}))).collect::<Vec<_>>();
        let summary = manifest_summary(&included, &excluded);
        assert_eq!(summary.parsed(), Some(original["summary"].clone()));
        let bytes = zip::pretty_json(&manifest(&package, &included, summary))
            .unwrap_or_else(|_| panic!("manifest bytes"));
        assert_eq!(
            String::from_utf8(bytes).unwrap_or_default(),
            original["expectedUtf8"].as_str().unwrap_or("")
        );
    }
    #[test]
    fn hydrated_package_summary_matches_native_compact_bytes_and_length() {
        let golden: Value = serde_json::from_str(include_str!(
            "../../../../tools/rust-r2k/k-wire-golden.json"
        ))
        .unwrap_or_else(|_| panic!("Native K wire regression"));
        let source = &golden["package"];
        let body = &source["body"];
        let mut data = json!({});
        for (column, field) in [
            ("id", "id"),
            ("handover_id", "handoverId"),
            ("project_id", "projectId"),
            ("status", "status"),
            ("file_name", "fileName"),
            ("expires_at", "expiresAt"),
            ("created_by", "createdBy"),
            ("created_at", "createdAt"),
            ("downloaded_at", "downloadedAt"),
            ("download_count", "downloadCount"),
            ("failed_reason", "failedReason"),
        ] {
            data[column] = body[field].clone();
        }
        let mut entity = Entity::loaded(Table::DownloadPackage, data);
        entity
            .set_json(
                "manifest_summary",
                Wire(
                    source["inputManifestSummaryRaw"]
                        .as_str()
                        .unwrap_or("")
                        .into(),
                ),
            )
            .unwrap_or_else(|_| panic!("raw loaded JSON member order"));
        let output = package_summary(&entity).unwrap_or_else(|_| panic!("valid package summary"));
        assert_eq!(output.0, source["expectedBodyRaw"].as_str().unwrap_or(""));
        assert_eq!(
            output.0.len() as u64,
            source["contentLength"].as_u64().unwrap_or(0)
        );
        assert_eq!(output.0.len(), 643);
    }
}
