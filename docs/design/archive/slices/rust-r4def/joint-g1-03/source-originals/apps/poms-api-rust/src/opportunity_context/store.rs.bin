//! Existence-only references borrow the caller's connection and retain Native
//! eligibility rules. Domain services apply their original anchor checks.
use sqlx::{PgConnection, Row};
use uuid::Uuid;

pub struct ContactRef {
    pub id: Uuid,
    pub customer_id: Uuid,
    pub name: String,
    pub department: Option<String>,
    pub title: Option<String>,
}

pub async fn contact_by_id(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<ContactRef>, sqlx::Error> {
    sqlx::query("SELECT id,customer_id,name,department,title FROM poms.customer_contact WHERE id=$1::text::uuid")
        .bind(id).fetch_optional(connection).await?.map(|r| Ok(ContactRef {
            id:r.try_get("id")?, customer_id:r.try_get("customer_id")?, name:r.try_get("name")?,
            department:r.try_get("department")?, title:r.try_get("title")?,
        })).transpose()
}

pub struct FollowUpRef {
    pub id: Uuid,
    pub customer_id: Uuid,
    pub lead_id: Option<Uuid>,
    pub project_id: Option<Uuid>,
}

pub async fn follow_up_by_id(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<FollowUpRef>, sqlx::Error> {
    sqlx::query("SELECT id,customer_id,lead_id,project_id FROM poms.sales_follow_up_record WHERE id=$1::text::uuid")
        .bind(id).fetch_optional(connection).await?.map(|r| Ok(FollowUpRef {
            id:r.try_get("id")?, customer_id:r.try_get("customer_id")?,
            lead_id:r.try_get("lead_id")?, project_id:r.try_get("project_id")?,
        })).transpose()
}
