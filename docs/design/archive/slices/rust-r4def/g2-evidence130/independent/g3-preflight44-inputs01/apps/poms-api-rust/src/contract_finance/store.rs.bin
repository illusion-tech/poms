//! Typed SQL on a borrowed connection. No pool, transaction or cost producer.
use sqlx::{PgConnection, Postgres, QueryBuilder, Row, postgres::PgRow};
use uuid::Uuid;

use super::model::{Invoice, Payable, Payment, Receipt};

const RECEIPT_COLUMNS: &str = "id,contract_id,project_id,receipt_amount::text AS receipt_amount,receipt_date,source_type,status,confirmed_at,confirmed_by,row_version,created_at,updated_at";
const PAYMENT_COLUMNS: &str = "id,project_id,contract_id,payable_record_id,currency,amount_excluding_tax::text AS amount_excluding_tax,tax_amount::text AS tax_amount,amount_including_tax::text AS amount_including_tax,payment_date,cost_category,source_type,status,confirmed_at,confirmed_by,row_version,created_at,updated_at";
const INVOICE_COLUMNS: &str = "id,project_id,contract_id,invoice_type,invoice_no,invoice_amount::text AS invoice_amount,invoice_date,currency_code,currency_source,currency_source_snapshot_id,status,exception_status,exception_reason,exception_resolution,closed_at,close_reason,row_version,created_at,updated_at";
const PAYABLE_COLUMNS: &str = "p.id,p.project_id,p.contract_id,p.vendor_name,p.cost_category,p.payable_description,p.currency,p.amount_excluding_tax::text AS amount_excluding_tax,p.tax_amount::text AS tax_amount,p.amount_including_tax::text AS amount_including_tax,p.expected_payment_date,p.status,p.evidence_summary,p.attachment_count,p.closed_at,p.close_reason,p.voided_at,p.void_reason,p.row_version,p.created_at,p.updated_at,(SELECT COALESCE(SUM(x.amount_excluding_tax),0.00)::text FROM poms.payment_record x WHERE x.payable_record_id=p.id AND x.status='confirmed') AS settled_amount,EXISTS(SELECT 1 FROM poms.payment_record x WHERE x.payable_record_id=p.id) AS any_payment";

fn receipt(row: PgRow) -> Result<Receipt, sqlx::Error> {
    Ok(Receipt {
        id: row.try_get("id")?,
        contract_id: row.try_get("contract_id")?,
        project_id: row.try_get("project_id")?,
        receipt_amount: row.try_get("receipt_amount")?,
        receipt_date: row.try_get("receipt_date")?,
        source_type: row.try_get("source_type")?,
        status: row.try_get("status")?,
        confirmed_at: row.try_get("confirmed_at")?,
        confirmed_by: row.try_get("confirmed_by")?,
        row_version: row.try_get("row_version")?,
        created_at: row.try_get("created_at")?,
        updated_at: row.try_get("updated_at")?,
    })
}
fn payable(row: PgRow) -> Result<Payable, sqlx::Error> {
    Ok(Payable {
        id: row.try_get("id")?,
        project_id: row.try_get("project_id")?,
        contract_id: row.try_get("contract_id")?,
        vendor_name: row.try_get("vendor_name")?,
        cost_category: row.try_get("cost_category")?,
        payable_description: row.try_get("payable_description")?,
        currency: row.try_get("currency")?,
        amount_excluding_tax: row.try_get("amount_excluding_tax")?,
        tax_amount: row.try_get("tax_amount")?,
        amount_including_tax: row.try_get("amount_including_tax")?,
        expected_payment_date: row.try_get("expected_payment_date")?,
        status: row.try_get("status")?,
        evidence_summary: row.try_get("evidence_summary")?,
        attachment_count: row.try_get("attachment_count")?,
        closed_at: row.try_get("closed_at")?,
        close_reason: row.try_get("close_reason")?,
        voided_at: row.try_get("voided_at")?,
        void_reason: row.try_get("void_reason")?,
        row_version: row.try_get("row_version")?,
        created_at: row.try_get("created_at")?,
        updated_at: row.try_get("updated_at")?,
        settled_amount: row.try_get("settled_amount")?,
        any_payment: row.try_get("any_payment")?,
    })
}
fn payment(row: PgRow) -> Result<Payment, sqlx::Error> {
    Ok(Payment {
        id: row.try_get("id")?,
        project_id: row.try_get("project_id")?,
        contract_id: row.try_get("contract_id")?,
        payable_record_id: row.try_get("payable_record_id")?,
        currency: row.try_get("currency")?,
        amount_excluding_tax: row.try_get("amount_excluding_tax")?,
        tax_amount: row.try_get("tax_amount")?,
        amount_including_tax: row.try_get("amount_including_tax")?,
        payment_date: row.try_get("payment_date")?,
        cost_category: row.try_get("cost_category")?,
        source_type: row.try_get("source_type")?,
        status: row.try_get("status")?,
        confirmed_at: row.try_get("confirmed_at")?,
        confirmed_by: row.try_get("confirmed_by")?,
        row_version: row.try_get("row_version")?,
        created_at: row.try_get("created_at")?,
        updated_at: row.try_get("updated_at")?,
    })
}
fn invoice(row: PgRow) -> Result<Invoice, sqlx::Error> {
    Ok(Invoice {
        id: row.try_get("id")?,
        project_id: row.try_get("project_id")?,
        contract_id: row.try_get("contract_id")?,
        invoice_type: row.try_get("invoice_type")?,
        invoice_number: row.try_get("invoice_no")?,
        invoice_amount: row.try_get("invoice_amount")?,
        invoice_date: row.try_get("invoice_date")?,
        currency_code: row.try_get("currency_code")?,
        currency_source: row.try_get("currency_source")?,
        currency_source_snapshot_id: row.try_get("currency_source_snapshot_id")?,
        status: row.try_get("status")?,
        exception_status: row.try_get("exception_status")?,
        exception_reason: row.try_get("exception_reason")?,
        exception_resolution: row.try_get("exception_resolution")?,
        closed_at: row.try_get("closed_at")?,
        close_reason: row.try_get("close_reason")?,
        row_version: row.try_get("row_version")?,
        created_at: row.try_get("created_at")?,
        updated_at: row.try_get("updated_at")?,
    })
}

pub(super) async fn receipt_by_id(
    c: &mut PgConnection,
    id: Uuid,
    lock: bool,
) -> Result<Option<Receipt>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("SELECT ");
    query
        .push(RECEIPT_COLUMNS)
        .push(" FROM poms.receipt_record WHERE id=")
        .push_bind(id);
    if lock {
        query.push(" FOR UPDATE");
    }
    query
        .build()
        .fetch_optional(c)
        .await?
        .map(receipt)
        .transpose()
}
pub(super) async fn payable_by_id(
    c: &mut PgConnection,
    id: Uuid,
    lock: bool,
) -> Result<Option<Payable>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("SELECT ");
    query
        .push(PAYABLE_COLUMNS)
        .push(" FROM poms.payable_record p WHERE p.id=")
        .push_bind(id);
    if lock {
        query.push(" FOR UPDATE OF p");
    }
    query
        .build()
        .fetch_optional(c)
        .await?
        .map(payable)
        .transpose()
}
pub(super) async fn payment_by_id(
    c: &mut PgConnection,
    id: Uuid,
    lock: bool,
) -> Result<Option<Payment>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("SELECT ");
    query
        .push(PAYMENT_COLUMNS)
        .push(" FROM poms.payment_record WHERE id=")
        .push_bind(id);
    if lock {
        query.push(" FOR UPDATE");
    }
    query
        .build()
        .fetch_optional(c)
        .await?
        .map(payment)
        .transpose()
}
pub(super) async fn invoice_by_id(
    c: &mut PgConnection,
    id: Uuid,
    lock: bool,
) -> Result<Option<Invoice>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("SELECT ");
    query
        .push(INVOICE_COLUMNS)
        .push(" FROM poms.invoice_record WHERE id=")
        .push_bind(id);
    if lock {
        query.push(" FOR UPDATE");
    }
    query
        .build()
        .fetch_optional(c)
        .await?
        .map(invoice)
        .transpose()
}
pub(super) async fn receipts(c: &mut PgConnection, id: Uuid) -> Result<Vec<Receipt>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("SELECT ");
    query
        .push(RECEIPT_COLUMNS)
        .push(" FROM poms.receipt_record WHERE contract_id=")
        .push_bind(id)
        .push(" ORDER BY receipt_date DESC,created_at DESC");
    query
        .build()
        .fetch_all(c)
        .await?
        .into_iter()
        .map(receipt)
        .collect()
}
pub(super) async fn payables(c: &mut PgConnection, id: Uuid) -> Result<Vec<Payable>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("SELECT ");
    query
        .push(PAYABLE_COLUMNS)
        .push(" FROM poms.payable_record p WHERE p.project_id=")
        .push_bind(id)
        .push(" ORDER BY p.expected_payment_date DESC,p.created_at DESC");
    query
        .build()
        .fetch_all(c)
        .await?
        .into_iter()
        .map(payable)
        .collect()
}
pub(super) async fn payments(c: &mut PgConnection, id: Uuid) -> Result<Vec<Payment>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("SELECT ");
    query
        .push(PAYMENT_COLUMNS)
        .push(" FROM poms.payment_record WHERE project_id=")
        .push_bind(id)
        .push(" ORDER BY payment_date DESC,created_at DESC");
    query
        .build()
        .fetch_all(c)
        .await?
        .into_iter()
        .map(payment)
        .collect()
}
pub(super) async fn invoices(c: &mut PgConnection, id: Uuid) -> Result<Vec<Invoice>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("SELECT ");
    query
        .push(INVOICE_COLUMNS)
        .push(" FROM poms.invoice_record WHERE project_id=")
        .push_bind(id)
        .push(" ORDER BY invoice_date DESC,created_at DESC");
    query
        .build()
        .fetch_all(c)
        .await?
        .into_iter()
        .map(invoice)
        .collect()
}
pub(super) async fn settled_amount(c: &mut PgConnection, id: Uuid) -> Result<String, sqlx::Error> {
    sqlx::query_scalar("SELECT COALESCE(SUM(amount_excluding_tax),0.00)::text FROM poms.payment_record WHERE payable_record_id=$1 AND status='confirmed'")
        .bind(id).fetch_one(c).await
}

/// Cost sources are varchar, not a UUID FK. Parse identities without an unsafe
/// SQL cast that could make an unrelated legacy source string abort a read.
pub(super) async fn current_mapping(
    c: &mut PgConnection,
    source_type: &str,
    source_id: Uuid,
) -> Result<Option<Uuid>, sqlx::Error> {
    let rows = sqlx::query("SELECT id,source_id FROM poms.project_actual_cost_record WHERE source_type=$1 AND record_status IN ('registered','confirmed','included') ORDER BY created_at DESC")
        .bind(source_type).fetch_all(c).await?;
    for row in rows {
        let source: Option<String> = row.try_get("source_id")?;
        if source.as_deref().and_then(|s| Uuid::parse_str(s).ok()) == Some(source_id) {
            return Ok(Some(row.try_get("id")?));
        }
    }
    Ok(None)
}

pub(super) async fn insert_receipt(c: &mut PgConnection, r: &Receipt) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO poms.receipt_record(id,contract_id,project_id,receipt_amount,receipt_date,source_type,status,confirmed_at,confirmed_by,row_version,created_at,updated_at) VALUES($1,$2,$3,$4::text::numeric,$5,$6,$7,$8,$9,$10,$11,$12)")
        .bind(r.id).bind(r.contract_id).bind(r.project_id).bind(&r.receipt_amount).bind(r.receipt_date).bind(&r.source_type).bind(&r.status)
        .bind(r.confirmed_at).bind(r.confirmed_by).bind(r.row_version).bind(r.created_at).bind(r.updated_at).execute(c).await?;
    Ok(())
}
pub(super) async fn update_receipt(
    c: &mut PgConnection,
    r: &Receipt,
    expected: i32,
) -> Result<bool, sqlx::Error> {
    Ok(sqlx::query("UPDATE poms.receipt_record SET status=$1,confirmed_at=$2,confirmed_by=$3,row_version=$4,updated_at=$5 WHERE id=$6 AND row_version=$7")
        .bind(&r.status).bind(r.confirmed_at).bind(r.confirmed_by).bind(r.row_version).bind(r.updated_at).bind(r.id).bind(expected).execute(c).await?.rows_affected() == 1)
}
pub(super) async fn insert_payable(c: &mut PgConnection, p: &Payable) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO poms.payable_record(id,project_id,contract_id,vendor_name,cost_category,payable_description,currency,amount_excluding_tax,tax_amount,amount_including_tax,expected_payment_date,status,evidence_summary,attachment_count,closed_at,close_reason,voided_at,void_reason,row_version,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8::text::numeric,$9::text::numeric,$10::text::numeric,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)")
        .bind(p.id).bind(p.project_id).bind(p.contract_id).bind(&p.vendor_name).bind(&p.cost_category).bind(&p.payable_description).bind(&p.currency)
        .bind(&p.amount_excluding_tax).bind(&p.tax_amount).bind(&p.amount_including_tax).bind(p.expected_payment_date).bind(&p.status)
        .bind(&p.evidence_summary).bind(p.attachment_count).bind(p.closed_at).bind(&p.close_reason).bind(p.voided_at).bind(&p.void_reason)
        .bind(p.row_version).bind(p.created_at).bind(p.updated_at).execute(c).await?;
    Ok(())
}
pub(super) async fn update_payable(
    c: &mut PgConnection,
    p: &Payable,
    expected: i32,
) -> Result<bool, sqlx::Error> {
    Ok(sqlx::query("UPDATE poms.payable_record SET contract_id=$1,vendor_name=$2,cost_category=$3,payable_description=$4,currency=$5,amount_excluding_tax=$6::text::numeric,tax_amount=$7::text::numeric,amount_including_tax=$8::text::numeric,expected_payment_date=$9,status=$10,evidence_summary=$11,attachment_count=$12,closed_at=$13,close_reason=$14,voided_at=$15,void_reason=$16,row_version=$17,updated_at=$18 WHERE id=$19 AND row_version=$20")
        .bind(p.contract_id).bind(&p.vendor_name).bind(&p.cost_category).bind(&p.payable_description).bind(&p.currency)
        .bind(&p.amount_excluding_tax).bind(&p.tax_amount).bind(&p.amount_including_tax).bind(p.expected_payment_date).bind(&p.status)
        .bind(&p.evidence_summary).bind(p.attachment_count).bind(p.closed_at).bind(&p.close_reason).bind(p.voided_at).bind(&p.void_reason)
        .bind(p.row_version).bind(p.updated_at).bind(p.id).bind(expected).execute(c).await?.rows_affected() == 1)
}
pub(super) async fn insert_payment(c: &mut PgConnection, p: &Payment) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO poms.payment_record(id,project_id,contract_id,payable_record_id,currency,amount_excluding_tax,tax_amount,amount_including_tax,payment_date,cost_category,source_type,status,confirmed_at,confirmed_by,row_version,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6::text::numeric,$7::text::numeric,$8::text::numeric,$9,$10,$11,$12,$13,$14,$15,$16,$17)")
        .bind(p.id).bind(p.project_id).bind(p.contract_id).bind(p.payable_record_id).bind(&p.currency)
        .bind(&p.amount_excluding_tax).bind(&p.tax_amount).bind(&p.amount_including_tax).bind(p.payment_date).bind(&p.cost_category).bind(&p.source_type)
        .bind(&p.status).bind(p.confirmed_at).bind(p.confirmed_by).bind(p.row_version).bind(p.created_at).bind(p.updated_at).execute(c).await?;
    Ok(())
}
pub(super) async fn update_payment(
    c: &mut PgConnection,
    p: &Payment,
    expected: i32,
) -> Result<bool, sqlx::Error> {
    Ok(sqlx::query("UPDATE poms.payment_record SET status=$1,confirmed_at=$2,confirmed_by=$3,row_version=$4,updated_at=$5 WHERE id=$6 AND row_version=$7")
        .bind(&p.status).bind(p.confirmed_at).bind(p.confirmed_by).bind(p.row_version).bind(p.updated_at).bind(p.id).bind(expected).execute(c).await?.rows_affected() == 1)
}
pub(super) async fn insert_invoice(c: &mut PgConnection, i: &Invoice) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO poms.invoice_record(id,project_id,contract_id,invoice_type,invoice_no,invoice_amount,invoice_date,status,exception_status,exception_reason,exception_resolution,closed_at,close_reason,row_version,created_at,updated_at,currency_code,currency_source,currency_source_snapshot_id) VALUES($1,$2,$3,$4,$5,$6::text::numeric,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)")
        .bind(i.id).bind(i.project_id).bind(i.contract_id).bind(&i.invoice_type).bind(&i.invoice_number).bind(&i.invoice_amount).bind(i.invoice_date)
        .bind(&i.status).bind(&i.exception_status).bind(&i.exception_reason).bind(&i.exception_resolution).bind(i.closed_at).bind(&i.close_reason)
        .bind(i.row_version).bind(i.created_at).bind(i.updated_at).bind(&i.currency_code).bind(&i.currency_source).bind(i.currency_source_snapshot_id).execute(c).await?;
    Ok(())
}
pub(super) async fn update_invoice(
    c: &mut PgConnection,
    i: &Invoice,
    expected: i32,
) -> Result<bool, sqlx::Error> {
    Ok(sqlx::query("UPDATE poms.invoice_record SET contract_id=$1,invoice_no=$2,invoice_amount=$3::text::numeric,invoice_date=$4,status=$5,exception_status=$6,exception_reason=$7,exception_resolution=$8,closed_at=$9,close_reason=$10,row_version=$11,updated_at=$12,currency_code=$13,currency_source=$14,currency_source_snapshot_id=$15 WHERE id=$16 AND row_version=$17")
        .bind(i.contract_id).bind(&i.invoice_number).bind(&i.invoice_amount).bind(i.invoice_date).bind(&i.status).bind(&i.exception_status)
        .bind(&i.exception_reason).bind(&i.exception_resolution).bind(i.closed_at).bind(&i.close_reason).bind(i.row_version).bind(i.updated_at)
        .bind(&i.currency_code).bind(&i.currency_source).bind(i.currency_source_snapshot_id).bind(i.id).bind(expected).execute(c).await?.rows_affected() == 1)
}
