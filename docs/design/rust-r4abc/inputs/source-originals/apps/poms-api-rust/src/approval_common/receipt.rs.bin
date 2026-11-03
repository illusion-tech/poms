//! In-memory INSERT/COMMIT evidence. This is not a database audit or an
//! ownership decision. Callers publish only after an acknowledged real COMMIT.
use serde::Serialize;

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TraceContext {
    pub run_id: String,
    pub case_id: String,
    pub index: usize,
    pub op: String,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateReceipt {
    pub table: String,
    pub id: String,
    pub proof: CreateProof,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProof {
    pub kind: &'static str,
    pub runtime: &'static str,
    pub create_event_seq: u64,
    pub create_transaction: u64,
    pub create_context: TraceContext,
    pub releases: Vec<u64>,
    pub outer_commit_event_seq: Option<u64>,
}
#[derive(Clone, Debug)]
struct Scope {
    id: u64,
    pending: Vec<CreateReceipt>,
    known: bool,
}
#[derive(Clone, Debug, Default)]
pub struct WriteTrace {
    pub context: TraceContext,
    scopes: Vec<Scope>,
    committed: Vec<CreateReceipt>,
    sequence: u64,
    pub incomplete: bool,
}
impl WriteTrace {
    pub fn depth(&self) -> usize {
        self.scopes.len()
    }
    pub fn begin(&mut self, known: bool) {
        self.sequence += 1;
        self.scopes.push(Scope {
            id: self.sequence,
            pending: Vec::new(),
            known,
        });
    }
    pub fn inserted(&mut self, table: &str, id: &str) {
        self.sequence += 1;
        if let Some(scope) = self.scopes.last_mut() {
            scope.pending.push(CreateReceipt {
                table: table.into(),
                id: id.into(),
                proof: CreateProof {
                    kind: "rust-insert-outer-commit",
                    runtime: "sqlx-0.9.0",
                    create_event_seq: self.sequence,
                    create_transaction: scope.id,
                    create_context: self.context.clone(),
                    releases: Vec::new(),
                    outer_commit_event_seq: None,
                },
            });
        } else {
            self.incomplete = true;
        }
    }
    /// Only immediately after SQLx Transaction::commit returned Ok.
    pub fn commit_succeeded(&mut self) {
        self.sequence += 1;
        if let Some(mut scope) = self.scopes.pop() {
            if let Some(parent) = self.scopes.last_mut() {
                parent.known &= scope.known;
                for row in &mut scope.pending {
                    row.proof.releases.push(self.sequence);
                }
                parent.pending.extend(scope.pending);
            } else if scope.known {
                for row in &mut scope.pending {
                    row.proof.outer_commit_event_seq = Some(self.sequence);
                }
                self.committed.extend(scope.pending);
            } else {
                self.incomplete = true;
            }
        } else {
            self.incomplete = true;
        }
    }
    pub fn rolled_back(&mut self) {
        self.sequence += 1;
        if self.scopes.pop().is_none() {
            self.incomplete = true;
        }
    }
    pub fn unknown_commit(&mut self) {
        self.incomplete = true;
        self.scopes.pop();
    }
    pub fn take_committed(&mut self) -> Vec<CreateReceipt> {
        std::mem::take(&mut self.committed)
    }
}
