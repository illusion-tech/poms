//! Request-scoped participation in the common/domain flush, using its connection.
//! Dropping a read or an error never schedules a separate authentication write.
use crate::{
    approval_common::{CommonFailure, CommonFlushFuture, CommonFlushParticipant},
    auth::model::{ResolvedSession, SessionFlush, clock_now},
};
use chrono::{DateTime, Utc};
use sqlx::PgConnection;

pub(crate) struct PendingAuthentication {
    pending: Option<SessionFlush>,
    prepared_at: Option<DateTime<Utc>>,
}

impl PendingAuthentication {
    pub(crate) fn from_resolved(session: &ResolvedSession) -> Self {
        Self {
            pending: session.pending_flush.clone(),
            prepared_at: None,
        }
    }
}

impl CommonFlushParticipant for PendingAuthentication {
    fn has_pending(&self) -> bool {
        self.pending.is_some()
    }

    fn prepare_flush(&mut self) {
        self.prepared_at = self.pending.as_ref().map(|_| clock_now());
    }

    fn flush_once<'a>(&'a mut self, connection: &'a mut PgConnection) -> CommonFlushFuture<'a> {
        Box::pin(async move {
            if let Some(pending) = self.pending.take() {
                let updated_at = self.prepared_at.take().ok_or_else(|| {
                    CommonFailure::unexpected("Authentication update timestamp was not prepared")
                })?;
                crate::auth::store::flush_managed_session_at(connection, &pending, updated_at)
                    .await
                    .map_err(CommonFailure::from)?;
            }
            Ok(())
        })
    }
}
