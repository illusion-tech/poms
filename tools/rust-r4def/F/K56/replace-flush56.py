from pathlib import Path

root = Path(__file__).resolve().parents[4]
path = root / "apps/poms-api-rust/src/attachments/store.rs"
text = path.read_text(encoding="utf-8-sig")
start = text.index("/// Changes of all loaded J entities participate")
end = text.index("\n#[cfg(test)]", start)
replacement = r'''/// Child K writers use this same lock protocol. A failed child flush cannot replay
/// its dirty identity map; the service's guarded entry additionally restores its
/// complete pre-mutation checkpoint on a known rollback.
pub async fn flush(
    database: &Database,
    entities: &mut [Entity],
    pending: &mut Option<SessionFlush>,
    audit: Option<AuditWrite>,
) -> Result<(), StorageFailure> {
    flush_guarded(database, entities, pending, audit, FlushGuard::default())
        .await.map_err(|failure| failure.error)
}
pub(super) async fn flush_guarded(
    database: &Database,
    entities: &mut [Entity],
    pending: &mut Option<SessionFlush>,
    audit: Option<AuditWrite>,
    guard: FlushGuard,
) -> Result<(), FlushFailure> {
    if entities.iter().any(|e| e.poisoned) {
        return Err(FlushFailure { error: StorageFailure::internal(), disposition: CommitDisposition::Unknown });
    }
    let changes = entities.iter().enumerate()
        .filter(|(_,e)|e.original.is_none()||!e.dirty().is_empty())
        .map(|(i,e)|(i,e.clone())).collect::<Vec<_>>();
    if changes.is_empty() && pending.is_none() && audit.is_none()
        && guard.session_rules.is_empty() && guard.active_links.is_empty() {
        return Ok(());
    }
    let phase = Arc::new(AtomicU8::new(0));
    let journal = phase.clone();
    let proof_entities = entities.to_vec();
    let managed = pending.clone();
    let result = database.with_connection(move |connection| Box::pin(async move {
        // Set before BEGIN: cancellation at any point after entry is conservative.
        journal.store(1, Ordering::SeqCst);
        let mut transaction = connection.begin().await?;
        let operation: Result<Vec<(usize,Entity)>,sqlx::Error> = async {
            lock_and_recheck(&mut transaction, &proof_entities, &guard).await?;
            let mut saved = Vec::new();
            let mut consumed = BTreeSet::new();
            for (index,entity) in changes.iter().filter(|(_,e)|early_release(e)) {
                saved.push((*index,update(&mut transaction,entity).await?));
                consumed.insert(*index);
            }
            for group in create_groups(&changes) {
                let rows=group.iter().map(|(_,e)|e.clone()).collect::<Vec<_>>();
                let inserted=insert_group(&mut transaction,&rows).await?;
                saved.extend(group.into_iter().zip(inserted).map(|((index,_),e)|(index,e)));
            }
            let mut other_tables=Vec::new();
            for (index,entity) in changes.iter().filter(|(i,e)|e.original.is_some()&&!consumed.contains(i)) {
                if matches!(entity.table,Table::Attachment|Table::Session|Table::Link) {
                    saved.push((*index,update(&mut transaction,entity).await?));
                } else if !other_tables.contains(&entity.table) {
                    other_tables.push(entity.table);
                }
            }
            for table in other_tables {
                let existing=changes.iter().filter(|(_,e)|e.original.is_some()&&e.table==table).collect::<Vec<_>>();
                let updated=update_many(&mut transaction,&existing.iter().map(|(_,e)|e.clone()).collect::<Vec<_>>()).await?;
                saved.extend(existing.into_iter().zip(updated).map(|((index,_),e)|(*index,e)));
            }
            if let Some(audit)=audit {
                sqlx::query("INSERT INTO poms.audit_log(event_type,target_type,target_id,operator_id,request_id,result,metadata,occurred_at) VALUES($1,'attachment',$2,$3,$4,$5,$6::text::jsonb,$7)")
                    .bind(audit.event).bind(audit.target).bind(audit.operator).bind(audit.request_id).bind(audit.result).bind(audit.metadata.0).bind(clock_now()).execute(&mut *transaction).await?;
            }
            if let Some(managed)=managed.as_ref(){crate::auth::store::flush_managed_session(&mut transaction,managed).await?;}
            Ok(saved)
        }.await;
        match operation {
            Ok(saved)=>{
                journal.store(3,Ordering::SeqCst);
                transaction.commit().await?;
                journal.store(4,Ordering::SeqCst);
                Ok(Ok(saved))
            },
            Err(error)=>{
                transaction.rollback().await?;
                journal.store(2,Ordering::SeqCst);
                Ok(Err(sql_failure(error)))
            }
        }
    })).await;
    let result = match result {
        Ok(result)=>result,
        Err(_)=>Err(StorageFailure::internal()),
    };
    match result {
        Ok(saved)=>{
            for (i,mut entity) in saved { entity.mark_committed(); entities[i]=entity; }
            *pending=None;
            Ok(())
        },
        Err(error)=>{
            // Poison also on known rollback for legacy child callers; a guarded
            // service checkpoint restore removes this only when rollback is proven.
            for entity in entities { entity.poisoned=true; }
            let disposition=if matches!(phase.load(Ordering::SeqCst),0|2) {CommitDisposition::KnownNotCommitted}else{CommitDisposition::Unknown};
            Err(FlushFailure {error,disposition})
        }
    }
}
'''
path.write_text(text[:start] + replacement + text[end:], encoding="utf-8", newline="\n")
