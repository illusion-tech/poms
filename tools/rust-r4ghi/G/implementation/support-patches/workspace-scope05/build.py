"""Prepare an exact two-file Root proposal; never edit Root product files."""
from pathlib import Path
import difflib
import hashlib
import json
import subprocess

ROOT = Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
OUT = Path(__file__).resolve().parent
BASE = {
    'service.rs': '63a95b4ae77dcea3b42cbf2082591eaacdcc40831acb1e091b5f6301b8a6a0ee',
    'http.rs': 'bec86b82e612493fe24575cab11d4c83e5475809478d1a4e111d23b5dbd426cd',
}

def raw_hash(data):
    return hashlib.sha256(data).hexdigest()

texts = {}
records = []
for name, expected in BASE.items():
    path = ROOT / 'apps/poms-api-rust/src/project_workspace' / name
    data = path.read_bytes()
    if raw_hash(data) != expected:
        raise RuntimeError(f'Root base changed: {name}; regenerate only after explicit re-review')
    original = OUT / 'base' / (name + '.bin')
    original.parent.mkdir(parents=True, exist_ok=True)
    original.write_bytes(data)
    texts[name] = data.decode('utf-8-sig').replace('\r\n', '\n')

service = texts['service.rs']
service = service.replace('use serde_json::{Value, json};', 'use serde_json::{Value, json};\nuse sqlx::Connection;')
service = service.replace('    auth::model::{ResolvedSession, clock_now},', '''    approval::{context::PendingAuthentication},
    approval_common::{CommonSession, CommonState, store as common_store},
    auth::model::clock_now,
    contract_support::{Actor, Error as BusinessError},''')
service = service.replace('    projects::{model::Wire, store::ProjectRow},', '''    projects::{model::Wire, store::ProjectRow},
    project_action_authorization::{self as scope, ProjectAction, ProjectActionTarget},''')
service = service.replace('    Database(DbError),\n    Internal,', '    Database(DbError),\n    Business(BusinessError),\n    Internal,')
service = service.replace('impl Error {\n    pub fn into_api_error', '''impl From<sqlx::Error> for Error {
    fn from(value: sqlx::Error) -> Self {
        Self::Business(value.into())
    }
}
impl Error {
    pub fn into_api_error''')
service = service.replace('            Self::Database(_) | Self::Internal => ApiError::internal(),', '''            Self::Business(error) => error.into_api_error(),
            Self::Database(_) | Self::Internal => ApiError::internal(),''')
start = service.index('    pub async fn guidance(')
end = service.index('\npub(crate) fn iso', start)
body = '''    pub async fn guidance(
        &self,
        project_id: &str,
        actor: Actor,
    ) -> Result<Wire, Error> {
        self.read(project_id, WorkspaceRead::Guidance, actor).await
    }

    pub async fn timeline(
        &self,
        project_id: &str,
        actor: Actor,
    ) -> Result<Wire, Error> {
        self.read(project_id, WorkspaceRead::Timeline, actor).await
    }

    async fn read(
        &self,
        project_id: &str,
        kind: WorkspaceRead,
        actor: Actor,
    ) -> Result<Wire, Error> {
        let project_id = Uuid::parse_str(project_id)
            .map_err(|_| Error::Business(BusinessError::BadRequest("Invalid project UUID".into())))?;
        // This existing service owns the outer TX. Authorization, source reads,
        // projection and pending authentication use only its borrowed session.
        self.database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut tx = connection.begin().await?;
                    let mut state = CommonState::default();
                    state.trace.begin(true);
                    let mut participant = PendingAuthentication::from_resolved(&actor.session);
                    let result = {
                        let mut session = CommonSession::borrow_with_participant(
                            &mut tx,
                            &mut state,
                            &mut participant,
                        );
                        session.request_id = actor.request_id.clone();
                        match read_with_session(&mut session, project_id, kind, &actor).await {
                            Ok(value) => common_store::flush(&mut session)
                                .await
                                .map_err(BusinessError::from)
                                .map_err(Error::Business)
                                .map(|()| value),
                            Err(error) => Err(error),
                        }
                    };
                    match result {
                        Ok(value) => match tx.commit().await {
                            Ok(()) => {
                                state.trace.commit_succeeded();
                                Ok(Ok(value))
                            }
                            Err(error) => {
                                state.trace.unknown_commit();
                                Err(error)
                            }
                        },
                        Err(error) => {
                            let rollback = tx.rollback().await;
                            state.trace.rolled_back();
                            rollback?;
                            Ok(Err(error))
                        }
                    }
                })
            })
            .await?
    }
}

#[derive(Clone, Copy)]
enum WorkspaceRead {
    Guidance,
    Timeline,
}

async fn read_with_session(
    session: &mut CommonSession<'_, '_>,
    project_id: Uuid,
    kind: WorkspaceRead,
    actor: &Actor,
) -> Result<Wire, Error> {
    let proof = scope::require(
        session,
        actor,
        ProjectAction::ReadProjectAnchorOrIList,
        ProjectActionTarget::Project { id: project_id },
    )
    .await
    .map_err(Error::Business)?;
    if !proof.is_full_project() {
        return Err(Error::Business(BusinessError::Forbidden(
            "Project workspace requires full project responsibility".into(),
        )));
    }
    proof.assert_session(session, actor).await.map_err(Error::Business)?;
    // Scope has locked the true project before any workspace source query.
    let project = crate::projects::store::find(session.connection, &project_id.to_string())
        .await?
        .ok_or_else(|| Error::NotFound(format!("Project {project_id} not found")))?;
    match kind {
        WorkspaceRead::Guidance => guidance_with_session(session, &project, actor).await,
        WorkspaceRead::Timeline => timeline_with_session(session, &project).await,
    }
}

async fn guidance_with_session(
    session: &mut CommonSession<'_, '_>,
    project: &ProjectRow,
    actor: &Actor,
) -> Result<Wire, Error> {
    let users = store::user_names(
        session.connection,
        &project.owner_user_id.into_iter().collect::<Vec<_>>(),
    )
    .await?;
    let orgs = store::org_names(
        session.connection,
        &project.owner_org_id.into_iter().collect::<Vec<_>>(),
    )
    .await?;
    let snapshot = store::snapshot(session.connection, project.id).await?;
    let owner_name = project.owner_user_id.and_then(|id| users.get(&id)).map(String::as_str);
    let owner_org_name = project.owner_org_id.and_then(|id| orgs.get(&id)).map(String::as_str);
    let permissions = actor.session.user.permissions.iter().map(|value| value.as_ref()).collect::<Vec<&str>>();
    Ok(Wire::value(guidance::view(
        project,
        owner_name,
        owner_org_name,
        snapshot.as_ref(),
        &permissions,
        iso(clock_now())?,
    )?))
}

async fn timeline_with_session(
    session: &mut CommonSession<'_, '_>,
    project: &ProjectRow,
) -> Result<Wire, Error> {
    let contracts = store::contracts(session.connection, project.id).await?;
    let handover = store::handover(session.connection, project.id).await?;
    let acceptance = store::acceptance(session.connection, project.id).await?;
    let completion = store::completion(session.connection, project.id).await?;
    let archive = store::archive(session.connection, project.id).await?;
    let facts = Facts {
        contract: first_signed_contract(contracts),
        handover,
        acceptance,
        completion,
        archive,
    };
    let mut seen = HashSet::new();
    let actor_ids = [
        project.created_by,
        facts.contract.as_ref().and_then(|row| row.updated_by.or(row.created_by)),
        facts.handover.as_ref().and_then(|row| row.confirmed_by),
        facts.acceptance.as_ref().and_then(|row| row.confirmed_by),
        facts.completion.as_ref().and_then(|row| row.completed_by),
        facts.archive.as_ref().and_then(|row| row.archived_by),
        project.closed_at.and(project.updated_by),
    ]
    .into_iter()
    .flatten()
    .filter(|id| seen.insert(*id))
    .collect::<Vec<_>>();
    let users = store::user_names(session.connection, &actor_ids).await?;
    Ok(Wire::value(json!({
        "projectId":project.id,"events":timeline_events(project, &facts, &users)?,"generatedAt":iso(clock_now())?,
    })))
}
'''
service = service[:start] + body + service[end:]

http = texts['http.rs']
http = http.replace('    error::ApiError,', '''    contract_support::Actor,
    auth::projection::ProjectionRequestContext,
    error::ApiError,''')
http = http.replace('    let result = if parts.uri.path().ends_with("/workspace-guidance") {\n        service.guidance(&id, &session).await\n    } else {\n        service.timeline(&id).await\n    };', '''    let actor = Actor {
        id: session.user.user_id,
        request_id: metadata.request_id.clone(),
        session,
        request_context: ProjectionRequestContext {
            request_id: metadata.request_id,
            path: metadata.path,
            method: metadata.method,
            ip: metadata.info.ip,
            user_agent: metadata.info.user_agent,
        },
    };
    let result = if parts.uri.path().ends_with("/workspace-guidance") {
        service.guidance(&id, actor).await
    } else {
        service.timeline(&id, actor).await
    };''')

candidates = {'service.rs': service, 'http.rs': http}
for name, text in candidates.items():
    candidate = OUT / (name + '.candidate.rs')
    candidate.write_text(text, encoding='utf-8', newline='\n')
    subprocess.run(['rustfmt', '--edition', '2024', str(candidate)], check=True, cwd=OUT)
    formatted = candidate.read_text(encoding='utf-8')
    if name == 'service.rs':
        # The original pure wire projection and its tests are byte-for-byte text
        # equivalent after normalization; this proposal cannot add a new stage.
        original_tail = texts[name][texts[name].index('pub(crate) fn iso'):]
        candidate_tail = formatted[formatted.index('pub(crate) fn iso'):]
        if original_tail != candidate_tail:
            raise RuntimeError('Original wire/timeline renderer or pure tests changed')
        if formatted.count('.with_connection(') != 1:
            raise RuntimeError('Workspace must have one service-owned connection boundary')
    path = 'apps/poms-api-rust/src/project_workspace/' + name
    patch = ''.join(difflib.unified_diff(texts[name].splitlines(True), formatted.splitlines(True), fromfile='a/' + path, tofile='b/' + path, n=4))
    patch_path = OUT / (name + '.patch')
    patch_path.write_text(patch, encoding='utf-8', newline='\n')
    records.append({'path': path, 'baseSha256': BASE[name], 'candidate': candidate.name, 'candidateSha256': raw_hash(candidate.read_bytes()), 'patch': patch_path.name, 'patchSha256': raw_hash(patch_path.read_bytes())})

manifest = {
    'kind': 'Root-application-proposal-workspace-scope05',
    'files': records,
    'author': 'G; Root alone applies; I/H must independently review this workspace proposal',
    'rootProductModified': False,
    'implemented': ['Authenticated Actor created from the existing resolved HTTP guard/session and request metadata', 'Both old read entrypoints use one service-owned outer transaction and CommonSession', 'Real ReadProjectAnchorOrIList proof is strictly FullProject before source reads', 'Every workspace query borrows the same connection', 'Pending authentication coflush and outcome commit/rollback remain in the same TX; unknown commit is not reported as success', 'Original guidance/timeline wire shape, event source selection, enum spelling, sorting and pure projection tests preserved'],
    'actualValidation': {'rustfmt': 'passed on both exact candidates', 'wireTail': 'unchanged normalized text from original iso/rendering/tests onward', 'wholeCargo': 'not run; Root integrated compile required', 'databaseHttp': 'not run; Root owns isolated acceptance'},
    'requiredAcceptance': ['FullProject owner and true participant retain existing successful GET/HEAD wire output', 'Unrelated, own-condition-only, creator-only and legacy-anchor-only actors cannot read timeline/guidance', 'No unauthorized source reads before Scope succeeds', 'Pending authentication flush failure rolls back and emits no successful response', 'Query/projection failure and uncertain commit do not report success'],
    'gate': 'G2 support candidate only; original non-author P1 report remains unchanged; not self-approved G3',
}
manifest_path = OUT / 'manifest05.json'
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'manifest': str(manifest_path), 'sha256': raw_hash(manifest_path.read_bytes()), 'files': records}, ensure_ascii=False))
