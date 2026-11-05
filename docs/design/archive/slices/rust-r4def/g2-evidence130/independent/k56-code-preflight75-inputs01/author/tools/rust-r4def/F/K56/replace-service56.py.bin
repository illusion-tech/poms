from pathlib import Path

path = Path(__file__).resolve().parents[4] / "apps/poms-api-rust/src/attachments/service.rs"
text = path.read_text(encoding="utf-8-sig")


def replace_method(name, next_name, body):
    global text
    start = text.index(f"    pub async fn {name}(")
    end = text.index(f"    {next_name}", start)
    text = text[:start] + body + text[end:]


replace_method("complete", "pub async fn abort(", r'''    pub async fn complete(
        &self, id:&str, input:&RequestData, request_id:Option<&str>, ctx:&mut CallContext,
    )->Result<Wire> {
        ctx.checkpoint();
        let i=self.load(Table::Session,id,ctx).await?;
        self.session_access(i,"write",ctx).await?;
        self.expected(i,input,ctx)?;
        self.not_terminal(i,ctx)?;
        self.not_expired(i,ctx).await?;
        let session=ctx.entities[i].clone();
        if store::has_published_staging(&self.database,&session).await? {
            return Err(conflict("Attachment upload staging is already referenced"));
        }
        let attachment_id=uuid()?;
        let attempt=self.storage.completion_attempt(&location(&session),&attachment_id,&uuid()?,session.str("original_name")).await?;
        // Authorize/capture head + full links before actual snapshot I/O. This is
        // still only a plan; neither create_from_session nor this branch flushes.
        let (attachment,links,audit)=match self.create_from_session(i,attachment_id.clone(),attempt.location(),request_id,ctx).await {
            Ok(plan)=>plan,Err(error)=>{ctx.restore();return Err(error);}
        };
        let expected=[input.text("checksumSha256"),session.text("checksum_sha256")].into_iter().flatten().filter(|s|!s.is_empty()).collect::<Vec<_>>();
        let snapshot=match self.storage.prepare_completion_snapshot(&attempt,session.integer("size_bytes"),session.integer("max_size_bytes"),&expected,Some(session.str("mime_type"))).await {
            Ok(snapshot)=>snapshot,
            Err(error)=>{
                ctx.restore();
                // No business SQL was started. A failed PUT can still have left
                // partial bytes, so a fresh reference check remains necessary.
                if store::final_unreferenced(&self.database,&attachment_id,&attempt.location()).await.unwrap_or(false) {
                    let _=self.storage.discard_completion_attempt(&attempt).await;
                }
                return Err(error);
            }
        };
        ctx.entities[attachment].set("checksum_sha256",json!(snapshot.checksum));
        ctx.entities[attachment].set("size_bytes",json!(snapshot.size_bytes));
        ctx.entities[i].set("checksum_sha256",ctx.entities[attachment].data["checksum_sha256"].clone());
        if ctx.entities[i].data["uploaded_at"].is_null(){ctx.entities[i].set("uploaded_at",json!(clock_now()));}
        ctx.entities[i].set("status",json!("completed"));
        ctx.entities[i].set("completed_attachment_id",json!(attachment_id));
        ctx.entities[i].set("completed_at",json!(clock_now()));
        ctx.entities[i].set("failed_reason",Value::Null);
        ctx.guard.session_rules.insert(id.into(),store::SessionRule::Complete);
        ctx.guard.routing=attempt.routing();
        if let Err(failure)=self.persist(ctx,Some(audit)).await {
            if failure.disposition==store::CommitDisposition::KnownNotCommitted
                && store::final_unreferenced(&self.database,&attachment_id,&attempt.location()).await.unwrap_or(false) {
                let _=self.storage.discard_completion_attempt(&attempt).await;
            }
            return Err(failure.error);
        }
        let links=links.into_iter().map(|n|ctx.entities[n].clone()).collect::<Vec<_>>();
        Ok(attachment_summary(&ctx.entities[attachment],&links,None))
    }
''')

replace_method("abort", "async fn create_from_session(", r'''    pub async fn abort(
        &self,id:&str,input:&RequestData,request_id:Option<&str>,ctx:&mut CallContext,
    )->Result<Wire> {
        ctx.checkpoint();
        let i=self.load(Table::Session,id,ctx).await?;
        self.session_access(i,"write",ctx).await?;
        self.expected(i,input,ctx)?;
        let before=ctx.entities[i].clone();
        if before.str("status")=="completed" {
            return Err(conflict(format!("Attachment upload session {id} is already completed")));
        }
        if Self::terminal(before.str("status")) {return Ok(session_summary(&before));}
        if store::has_published_staging(&self.database,&before).await? {
            return Err(conflict("Attachment upload staging is already referenced"));
        }
        let cleanup=self.storage.capture_staging_cleanup(&location(&before)).await.ok();
        ctx.entities[i].set("status",json!("aborted"));
        ctx.entities[i].set("aborted_at",json!(clock_now()));
        ctx.entities[i].set_text("failed_reason",input.string("reason").filter(|v|!v.is_empty()));
        ctx.guard.session_rules.insert(id.into(),store::SessionRule::Abort);
        let e=&ctx.entities[i];
        let mut raw=BTreeMap::new();
        if let Some(reason)=e.raw.get("failed_reason"){raw.insert("reason".into(),reason.clone());}
        let metadata=Wire::object(json!({"reason":e.data["failed_reason"],"operationType":e.data["operation_type"]}),&raw);
        self.audit("attachment_upload_session.aborted",id,metadata,request_id,ctx).await?;
        // No I/O occurs on the losing/unknown/audit-failure branches above.
        if store::aborted_staging_unreferenced(&self.database,&ctx.entities[i]).await.unwrap_or(false)
            && let Some(cleanup)=cleanup {
            let _=self.storage.remove_captured_staging(&cleanup).await;
        }
        Ok(session_summary(&ctx.entities[i]))
    }
''')

start=text.index("    async fn create_from_session(")
end=text.index("    async fn summary(",start)
part=text[start:end]
part=part.replace("        i: usize,\n        request_id:","        i: usize,\n        id: String,\n        final_location: ObjectLocation,\n        request_id:",1)
part=part.replace("    ) -> Result<(Wire, String)> {","    ) -> Result<(usize, Vec<usize>, AuditWrite)> {",1)
a=part.index("        if session\n            .string(\"checksum_sha256\")")
b=part.index("        let (latest, links)",a)
part=part[:a]+part[b:]
part=part.replace("        let id = uuid()?;\n", "",1)
part=part.replace("        let version = previous.as_ref().map_or(1, |e| e.integer(\"version_no\") + 1);",r'''        let version = if let Some(previous)=previous.as_ref() {
            let rows=self.versions(&version_group,ctx).await?;
            if latest.is_some_and(|n|ctx.entities[n].version()!=previous.version()) {
                return Err(conflict("Attachment source changed while planning completion"));
            }
            let maximum=rows.iter().map(|n|ctx.entities[*n].integer("version_no")).max().unwrap_or(0);
            ctx.guard.version_max.insert(version_group.clone(),maximum);
            store::next_version(maximum)?
        } else {1};''')
part=part.replace('"storage_provider":session.data["provider_type"],"storage_bucket":session.data["storage_bucket"],"storage_key":session.data["storage_key"]','"storage_provider":final_location.storage_provider,"storage_bucket":final_location.storage_bucket,"storage_key":final_location.storage_key',1)
part=part.replace("        self.save(ctx).await?;\n", "",1)
part=part.replace("        self.audit(\n", "        let audit=self.audit_write(\n",1)
part=part.replace("        )\n        .await?;\n        let links = created", "        );\n        let links = created",1)
a=part.index("        let links = created")
part=part[:a]+"        Ok((attachment_index, created, audit))\n    }\n\n"
text=text[:start]+part+text[end:]

# Necessary audit and business rows are one flush for these commands.
for name,next_name in [("create_session","get_session"),("update","mark_final"),("mark_final","clear_final"),("clear_final","void"),("void","link"),("link","unlink"),("unlink","center")]:
    start=text.index(f"    pub async fn {name}(")
    end=text.index(f"    pub async fn {next_name}(",start) if f"    pub async fn {next_name}(" in text[start:] else text.index(f"    pub async fn {next_name}(&",start)
    part=text[start:end]
    brace=part.index(") -> Result<Wire> {")+len(") -> Result<Wire> {")
    part=part[:brace]+"\n        ctx.checkpoint();"+part[brace:]
    part=part.replace("        self.save(ctx).await?;\n","")
    part=part.replace("            self.save(ctx).await?;\n","")
    if name=="clear_final":
        part=part.replace("        let mut changed = false;\n","").replace("                changed = true;\n","")
        part=part.replace("        if changed {\n            }\n","").replace("        if changed {\n        }\n","")
    text=text[:start]+part+text[end:]

# Both control operations recheck the actual Session after any object/signing I/O.
for name,next_name in [("upload_target","proxy_object"),("proxy_object","complete")]:
    start=text.index(f"    pub async fn {name}(");end=text.index(f"    pub async fn {next_name}(",start)
    part=text[start:end]
    brace=part.index(") -> Result<Wire> {")+len(") -> Result<Wire> {")
    part=part[:brace]+"\n        ctx.checkpoint();"+part[brace:]
    part=part.replace("        self.can_receive(i, ctx).await?;",'''        self.can_receive(i, ctx).await?;
        if store::has_published_staging(&self.database,&ctx.entities[i]).await? {
            return Err(conflict("Attachment upload staging is already referenced"));
        }
        ctx.guard.session_rules.insert(id.into(),store::SessionRule::Receive);''')
    if name=="upload_target":
        a=part.index('        if ctx.entities[i].str("status") == "pending" {')
        b=part.index("        let e = ctx.entities[i].clone();",a)
        part=part[:a]+part[b:]
        a=part.index("        Ok(Wire::value(")
        part=part[:a]+'''        if ctx.entities[i].str("status")=="pending" {ctx.entities[i].set("status",json!("uploading"));}
        self.save(ctx).await?;
'''+part[a:]
    text=text[:start]+part+text[end:]

path.write_text(text, encoding="utf-8", newline="\n")
