use crate::{
    auth::model::clock_now,
    database::{Database, DbError},
};
use chrono::{DateTime, Datelike, Utc};
use serde::Deserialize;
use sqlx::PgConnection;
use std::{collections::BTreeMap, error::Error, fmt, sync::OnceLock};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BusinessNumberScope {
    Customer,
    Lead,
    Project,
    Contract,
    CostPaymentFact,
    CostInvoice,
    CostExpense,
    CostProcurement,
    CostLabor,
}
impl BusinessNumberScope {
    pub const ALL: &'static [Self] = &[
        Self::Customer,
        Self::Lead,
        Self::Project,
        Self::Contract,
        Self::CostPaymentFact,
        Self::CostInvoice,
        Self::CostExpense,
        Self::CostProcurement,
        Self::CostLabor,
    ];
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Customer => "customer",
            Self::Lead => "lead",
            Self::Project => "project",
            Self::Contract => "contract",
            Self::CostPaymentFact => "cost-payment-fact",
            Self::CostInvoice => "cost-invoice",
            Self::CostExpense => "cost-expense",
            Self::CostProcurement => "cost-procurement",
            Self::CostLabor => "cost-labor",
        }
    }
}
#[derive(Deserialize)]
struct Spec {
    prefix: String,
    padding: usize,
    description: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Authority {
    business_numbers: BTreeMap<String, Spec>,
}
fn specifications() -> &'static BTreeMap<String, Spec> {
    static AUTHORITY: OnceLock<Authority> = OnceLock::new();
    &AUTHORITY
        .get_or_init(|| {
            serde_json::from_str(include_str!("../../../../tools/rust-r2ef/e-authority.json"))
                .unwrap_or_else(|_| panic!("invalid generated number authority"))
        })
        .business_numbers
}
#[derive(Debug)]
pub enum BusinessNumberError {
    Database(DbError),
}
impl fmt::Display for BusinessNumberError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("business number persistence failed")
    }
}
impl Error for BusinessNumberError {}
impl From<DbError> for BusinessNumberError {
    fn from(error: DbError) -> Self {
        Self::Database(error)
    }
}
#[derive(Clone, Debug)]
pub struct BusinessNumberService {
    database: Database,
}
impl BusinessNumberService {
    pub fn new(database: Database) -> Self {
        Self { database }
    }
    pub async fn next(
        &self,
        scope: BusinessNumberScope,
        at: Option<DateTime<Utc>>,
    ) -> Result<String, BusinessNumberError> {
        let at = at.unwrap_or_else(clock_now);
        Ok(self
            .database
            .with_connection(move |connection| {
                Box::pin(Self::next_with_connection(connection, scope, at))
            })
            .await?)
    }
    /// A caller may pass &mut *transaction. This method never acquires another
    /// connection or starts/commits/rolls back the caller's transaction.
    pub async fn next_with_connection(
        connection: &mut PgConnection,
        scope: BusinessNumberScope,
        at: DateTime<Utc>,
    ) -> Result<String, sqlx::Error> {
        let spec = specifications().get(scope.as_str()).ok_or_else(|| {
            sqlx::Error::Protocol("missing generated business-number spec".into())
        })?;
        let period = at.year().to_string();
        let sequence:i32=sqlx::query_scalar("INSERT INTO poms.business_number_sequence (scope,period,next_value,prefix,padding,description,created_at,updated_at) VALUES($1,$2,2,$3,$4,$5,now(),now()) ON CONFLICT(scope,period) DO UPDATE SET next_value=poms.business_number_sequence.next_value+1,prefix=excluded.prefix,padding=excluded.padding,description=excluded.description,updated_at=now() RETURNING next_value-1")
            .bind(scope.as_str()).bind(&period).bind(&spec.prefix).bind(spec.padding as i32).bind(&spec.description).fetch_one(connection).await?;
        Ok(Self::format(&spec.prefix, &period, sequence, spec.padding))
    }
    pub fn format(prefix: &str, period: &str, value: i32, padding: usize) -> String {
        let value = value.to_string();
        format!(
            "{prefix}-{period}-{}{value}",
            "0".repeat(padding.saturating_sub(value.len()))
        )
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn original_nine_specs_and_padstart_semantics() {
        assert_eq!(specifications().len(), 9);
        for scope in BusinessNumberScope::ALL {
            let spec = &specifications()[scope.as_str()];
            assert_eq!(spec.padding, 6);
            assert!(!spec.prefix.is_empty());
        }
        assert_eq!(
            BusinessNumberService::format("LD", "2026", 1, 6),
            "LD-2026-000001"
        );
        assert_eq!(
            BusinessNumberService::format("LD", "2026", 1234567, 6),
            "LD-2026-1234567"
        );
        assert_eq!(
            BusinessNumberService::format("LD", "2026", -1, 6),
            "LD-2026-0000-1"
        );
    }
    #[test]
    fn periods_use_utc_instead_of_connection_timezone() {
        let at = DateTime::parse_from_rfc3339("2027-01-01T00:30:00+09:00")
            .unwrap_or_else(|_| panic!("date"))
            .with_timezone(&Utc);
        assert_eq!(at.year(), 2026);
    }
}
