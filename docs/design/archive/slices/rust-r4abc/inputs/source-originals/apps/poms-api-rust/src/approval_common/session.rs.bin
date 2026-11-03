//! A caller lends one connection and the same bounded common/domain state across its
//! service calls. Transaction/savepoint SQL is deliberately owned by the
//! service/store layer, calibrated against the Native witness, not callbacks.

use super::{CommonFailure, Text, model::*};
use super::{js::Data, receipt::WriteTrace, schema::Table};
use sqlx::PgConnection;
use std::{future::Future, pin::Pin};

#[derive(Clone, Debug)]
pub struct Managed<T> {
    pub original: Option<T>,
    pub current: T,
}

impl<T: Clone> Managed<T> {
    pub fn loaded(row: T) -> Self {
        Self {
            original: Some(row.clone()),
            current: row,
        }
    }

    pub fn created(row: T) -> Self {
        Self {
            original: None,
            current: row,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct EntityHandle(pub usize);
#[derive(Clone, Debug)]
pub struct TrackedEntity {
    pub table: Table,
    pub data: Data,
    pub original: Option<Data>,
    pub queued: bool,
    pub managed: bool,
}
#[derive(Clone, Debug, Default)]
pub struct CommonState {
    pub entities: Vec<TrackedEntity>,
    pub trace: WriteTrace,
    /// Explicit persistStack insertion order is separate from identity-map
    /// discovery order. Re-persisting an entry keeps its first position.
    pub(crate) persist_order: Vec<EntityHandle>,
}

impl CommonState {
    /// Native fork(clear:false) registers the same pre-existing JS objects and
    /// their WrappedEntity snapshot. Failure skips merging child-only objects,
    /// but does not rewind mutations of those already shared parent objects.
    pub fn share_existing_after_failed_fork(&mut self, child: &Self) {
        for (parent, forked) in self.entities.iter_mut().zip(&child.entities) {
            if parent.managed && parent.table == forked.table {
                parent.data = forked.data.clone();
                parent.original = forked.original.clone();
            }
        }
    }
    pub fn clear(&mut self) {
        // Like explicit EM.clear, detach identities. Existing probe bindings
        // cannot become handles to a different later entity. Receipts survive.
        for entity in &mut self.entities {
            entity.managed = false;
            entity.queued = false;
        }
        self.persist_order.clear();
    }
}

/// Pure borrowed-session construction. The transaction implementation
/// must not acquire a second pool connection or absorb unmodelled domain UoW.
pub struct CommonSession<'connection, 'state> {
    pub connection: &'connection mut PgConnection,
    pub state: &'state mut CommonState,
    pub participant: Option<&'state mut dyn CommonFlushParticipant>,
}

impl<'connection, 'state> CommonSession<'connection, 'state> {
    pub fn borrow(
        connection: &'connection mut PgConnection,
        state: &'state mut CommonState,
    ) -> Self {
        Self {
            connection,
            state,
            participant: None,
        }
    }

    pub fn borrow_with_participant(
        connection: &'connection mut PgConnection,
        state: &'state mut CommonState,
        participant: &'state mut dyn CommonFlushParticipant,
    ) -> Self {
        Self {
            connection,
            state,
            participant: Some(participant),
        }
    }
}

pub type CommonFlushFuture<'a> =
    Pin<Box<dyn Future<Output = Result<(), CommonFailure>> + Send + 'a>>;

/// A request-local managed entity participant. Its owner supplies the pending
/// change set; the shared flush controls ordering and transaction lifecycle.
pub trait CommonFlushParticipant: Send {
    fn has_pending(&self) -> bool;
    /// Mirrors ChangeSetComputer's property initializers, before SQL execution.
    /// Existing connection-only participants keep their original API behavior.
    fn prepare_flush(&mut self) {}
    fn flush_once<'a>(&'a mut self, connection: &'a mut PgConnection) -> CommonFlushFuture<'a>;
}

#[derive(Clone, Debug)]
pub struct DomainDecisionOutcome {
    pub target_id: Text,
    pub target_type: Text,
    pub business_status_after: Text,
    pub snapshot_id: Option<Text>,
}

pub type DomainDecisionFuture<'a> =
    Pin<Box<dyn Future<Output = Result<DomainDecisionOutcome, CommonFailure>> + Send + 'a>>;

/// Required for every positive common approval resolution. No production
/// implementation is supplied by L1. Implementations borrow this connection,
/// may enlist real domain writes, and must not control transaction lifecycle.
pub trait ApprovalDomainHandler: Send + Sync {
    fn apply<'a>(
        &'a self,
        context: &'a DecisionContext,
        connection: &'a mut PgConnection,
    ) -> DomainDecisionFuture<'a>;

    /// Production domains enlist in the caller's identity map and flushes.
    /// Existing connection-only handlers keep their original API contract.
    fn apply_with_session<'a>(
        &'a self,
        context: &'a DecisionContext,
        session: &'a mut CommonSession<'_, '_>,
    ) -> DomainDecisionFuture<'a> {
        self.apply(context, &mut *session.connection)
    }
}
