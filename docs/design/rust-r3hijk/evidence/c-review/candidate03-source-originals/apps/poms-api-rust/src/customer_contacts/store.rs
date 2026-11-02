use std::collections::BTreeMap;

use chrono::{DateTime, Utc};
use sqlx::{PgConnection, Postgres, QueryBuilder, Row, postgres::PgRow};
use uuid::Uuid;

use crate::auth::js_json::JsString;

#[derive(Clone)]
pub(super) struct Customer {
    pub id: Uuid,
    pub display_name: String,
}

#[derive(Clone)]
pub(super) struct Contact {
    pub id: Uuid,
    pub customer_id: Uuid,
    pub name: String,
    pub gender: String,
    pub department: Option<String>,
    pub title: Option<String>,
    pub work_phone: Option<String>,
    pub mobile: Option<String>,
    pub wechat: Option<String>,
    pub email: Option<String>,
    pub remark: Option<String>,
    pub status: String,
    pub row_version: i32,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<Uuid>,
}

fn contact(row: PgRow) -> Result<Contact, sqlx::Error> {
    Ok(Contact {
        id: row.try_get("id")?,
        customer_id: row.try_get("customer_id")?,
        name: row.try_get("name")?,
        gender: row.try_get("gender")?,
        department: row.try_get("department")?,
        title: row.try_get("title")?,
        work_phone: row.try_get("work_phone")?,
        mobile: row.try_get("mobile")?,
        wechat: row.try_get("wechat")?,
        email: row.try_get("email")?,
        remark: row.try_get("remark")?,
        status: row.try_get("status")?,
        row_version: row.try_get("row_version")?,
        created_at: row.try_get("created_at")?,
        created_by: row.try_get("created_by")?,
        updated_at: row.try_get("updated_at")?,
        updated_by: row.try_get("updated_by")?,
    })
}

pub(super) async fn customer(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<Customer>, sqlx::Error> {
    sqlx::query("SELECT id,display_name FROM poms.customer WHERE id=$1::text::uuid")
        .bind(id)
        .fetch_optional(connection)
        .await?
        .map(|row| {
            Ok(Customer {
                id: row.try_get("id")?,
                display_name: row.try_get("display_name")?,
            })
        })
        .transpose()
}

pub(super) async fn find(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<Contact>, sqlx::Error> {
    sqlx::query("SELECT * FROM poms.customer_contact WHERE id=$1::text::uuid")
        .bind(id)
        .fetch_optional(connection)
        .await?
        .map(contact)
        .transpose()
}

pub(super) async fn list(
    connection: &mut PgConnection,
    customer_id: Uuid,
) -> Result<Vec<Contact>, sqlx::Error> {
    sqlx::query("SELECT * FROM poms.customer_contact WHERE customer_id=$1 ORDER BY updated_at DESC,created_at DESC")
        .bind(customer_id).fetch_all(connection).await?.into_iter().map(contact).collect()
}

pub(super) async fn insert(
    connection: &mut PgConnection,
    row: &Contact,
) -> Result<i32, sqlx::Error> {
    sqlx::query_scalar("INSERT INTO poms.customer_contact (id,customer_id,name,gender,department,title,work_phone,mobile,wechat,email,remark,status,created_at,created_by,updated_at,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING row_version")
        .bind(row.id).bind(row.customer_id).bind(&row.name).bind(&row.gender)
        .bind(&row.department).bind(&row.title).bind(&row.work_phone).bind(&row.mobile)
        .bind(&row.wechat).bind(&row.email).bind(&row.remark).bind(&row.status)
        .bind(row.created_at).bind(row.created_by).bind(row.updated_at).bind(row.updated_by)
        .fetch_one(connection).await
}

pub(super) async fn update(
    connection: &mut PgConnection,
    before: &Contact,
    changes: &BTreeMap<&'static str, Option<JsString>>,
    operator_id: Uuid,
    at: DateTime<Utc>,
) -> Result<i32, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("UPDATE poms.customer_contact SET ");
    let mut first = true;
    for (key, value) in changes {
        if !first {
            query.push(",");
        }
        first = false;
        query
            .push(match *key {
                "workPhone" => "work_phone",
                key => key,
            })
            .push("=")
            .push_bind(value.as_ref().map(JsString::to_utf8_lossy));
    }
    if before.updated_by != Some(operator_id) {
        query.push(",updated_by=").push_bind(operator_id);
    }
    query
        .push(",updated_at=")
        .push_bind(at)
        .push(",row_version=row_version+1 WHERE id=")
        .push_bind(before.id)
        .push(" AND row_version=")
        .push_bind(before.row_version)
        .push(" RETURNING row_version");
    query
        .build_query_scalar::<i32>()
        .fetch_optional(connection)
        .await?
        .ok_or_else(|| sqlx::Error::Protocol("customer-contact managed version conflict".into()))
}

pub(super) fn set_text(row: &mut Contact, key: &str, value: Option<String>) {
    match key {
        "name" => row.name = value.unwrap_or_default(),
        "gender" => row.gender = value.unwrap_or_default(),
        "department" => row.department = value,
        "title" => row.title = value,
        "workPhone" => row.work_phone = value,
        "mobile" => row.mobile = value,
        "wechat" => row.wechat = value,
        "email" => row.email = value,
        "remark" => row.remark = value,
        "status" => row.status = value.unwrap_or_default(),
        _ => {}
    }
}
