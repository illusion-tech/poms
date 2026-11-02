//! Customer commands and reads preserve the original service boundaries.

use axum::http::StatusCode;
use serde_json::{Value, json};
use sqlx::Connection;
use std::{collections::HashMap, error::Error, fmt};
use uuid::Uuid;

pub use super::model::ActiveCustomerReference;
use super::{
    model::{
        self, CreateCustomer, CreateCustomerAlias, CustomerAliasSummary, CustomerDetailView,
        CustomerListQuery, CustomerListView, CustomerSummary, UpdateCustomer,
    },
    store::{self, AliasRow, CustomerRow},
};
use crate::{
    auth::{
        audit::{self, AuditLogInput, AuditResult},
        js_json::JsString,
        model::{SessionFlush, UserReadSnapshot, clock_now},
        store::flush_managed_session,
    },
    business_numbers::service::{BusinessNumberError, BusinessNumberScope, BusinessNumberService},
    compat::{json::Field, scalars::js_iso_string},
    database::{Database, DbError},
    error::ApiError,
    shared::generated::{CustomerAliasType, CustomerStatus, EntityAuditTargetType},
};

#[derive(Debug)]
pub enum CustomersError {
    BadRequest(String),
    NotFound(String),
    Conflict(String),
    Database(DbError),
    Internal,
}
impl fmt::Display for CustomersError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::BadRequest(_) | Self::Conflict(_) => "customer command was rejected",
            Self::NotFound(_) => "customer reference was not found",
            Self::Database(_) => "customer persistence failed",
            Self::Internal => "customer operation failed",
        })
    }
}
impl Error for CustomersError {}
impl From<DbError> for CustomersError {
    fn from(error: DbError) -> Self {
        Self::Database(error)
    }
}
impl CustomersError {
    /// Shared consumers forward the original customer error without remapping it.
    pub fn into_api_error(self) -> ApiError {
        match self {
            Self::BadRequest(message) => ApiError::message(StatusCode::BAD_REQUEST, message),
            Self::NotFound(message) => ApiError::message(StatusCode::NOT_FOUND, message),
            Self::Conflict(message) => ApiError::message(StatusCode::CONFLICT, message),
            Self::Database(_) | Self::Internal => ApiError::internal(),
        }
    }
}
#[derive(Clone, Debug)]
pub struct CustomersService {
    database: Database,
}
impl CustomersService {
    pub fn new(database: Database) -> Self {
        Self { database }
    }

    async fn require_customer(&self, id: &str) -> Result<CustomerRow, CustomersError> {
        let owned = id.to_owned();
        self.database
            .with_connection(move |connection| {
                Box::pin(async move { store::find_customer(connection, &owned).await })
            })
            .await?
            .ok_or_else(|| CustomersError::NotFound(format!("Customer {id} not found")))
    }
    pub async fn require_active_customer(
        &self,
        id: &str,
    ) -> Result<ActiveCustomerReference, CustomersError> {
        let customer = self.require_customer(id).await?;
        if customer.status != CustomerStatus::Active.as_str() {
            return Err(CustomersError::BadRequest(format!(
                "Customer {id} is not active"
            )));
        }
        Ok(ActiveCustomerReference {
            id: customer.id,
            display_name: customer.display_name,
        })
    }
    pub async fn list(
        &self,
        query: CustomerListQuery,
    ) -> Result<Vec<CustomerListView>, CustomersError> {
        let rows = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::list_customers(connection, &query).await })
            })
            .await?;
        let context = self.context(&rows).await?;
        rows.iter().map(|row| context.view(summary(row)?)).collect()
    }
    pub async fn get(&self, id: &str) -> Result<CustomerDetailView, CustomersError> {
        let row = self.require_customer(id).await?;
        self.detail(&row).await
    }
    async fn detail(&self, row: &CustomerRow) -> Result<CustomerDetailView, CustomersError> {
        self.detail_with_summary(row, summary(row)?).await
    }
    async fn detail_with_summary(
        &self,
        row: &CustomerRow,
        customer: CustomerSummary,
    ) -> Result<CustomerDetailView, CustomersError> {
        let id = row.id;
        let (aliases, context) = tokio::try_join!(
            async {
                Ok::<_, CustomersError>(
                    self.database
                        .with_connection(move |connection| Box::pin(store::aliases(connection, id)))
                        .await?,
                )
            },
            self.context(std::slice::from_ref(row)),
        )?;
        Ok(CustomerDetailView {
            customer: context.view(customer)?,
            aliases: aliases
                .iter()
                .map(alias_summary)
                .collect::<Result<_, _>>()?,
        })
    }
    pub async fn list_aliases(
        &self,
        id: &str,
    ) -> Result<Vec<CustomerAliasSummary>, CustomersError> {
        let customer = self.require_customer(id).await?;
        let rows = self
            .database
            .with_connection(move |connection| Box::pin(store::aliases(connection, customer.id)))
            .await?;
        rows.iter().map(alias_summary).collect()
    }
    async fn context(&self, rows: &[CustomerRow]) -> Result<ListContext, CustomersError> {
        if rows.is_empty() {
            return Ok(ListContext::default());
        }
        let customer_ids = rows.iter().map(|row| row.id).collect::<Vec<_>>();
        let user_ids = rows
            .iter()
            .filter_map(|row| row.owner_user_id)
            .collect::<Vec<_>>();
        let org_ids = rows
            .iter()
            .filter_map(|row| row.owner_org_id)
            .collect::<Vec<_>>();
        let lead_ids = customer_ids.clone();
        let project_ids = customer_ids.clone();
        let (users, orgs, leads, projects, contracts) = tokio::try_join!(
            self.database
                .with_connection(move |connection| Box::pin(async move {
                    store::owner_names(connection, &user_ids).await
                })),
            self.database
                .with_connection(move |connection| Box::pin(async move {
                    store::org_names(connection, &org_ids).await
                })),
            self.database
                .with_connection(move |connection| Box::pin(async move {
                    store::lead_counts(connection, &lead_ids).await
                })),
            self.database
                .with_connection(move |connection| Box::pin(async move {
                    store::project_counts(connection, &project_ids).await
                })),
            self.database
                .with_connection(move |connection| Box::pin(async move {
                    store::contract_counts(connection, &customer_ids).await
                })),
        )?;
        Ok(ListContext {
            users,
            orgs: orgs
                .into_iter()
                .map(|(id, name)| (id.to_string(), name))
                .collect(),
            leads,
            projects,
            contracts,
        })
    }
    pub async fn workspace_overview(&self, id: &str) -> Result<Value, CustomersError> {
        let customer = self.require_customer(id).await?;
        let id = customer.id;
        let (summary, leads, projects, contracts, follow_ups, discussions) =
            tokio::try_join!(
                self.database.with_connection(move |connection| Box::pin(
                    store::workspace_summary(connection, id)
                )),
                self.database
                    .with_connection(move |connection| Box::pin(store::workspace_leads(
                        connection, id
                    ))),
                self.database.with_connection(move |connection| Box::pin(
                    store::workspace_projects(connection, id)
                )),
                self.database.with_connection(move |connection| Box::pin(
                    store::workspace_contracts(connection, id)
                )),
                self.database.with_connection(move |connection| Box::pin(
                    store::workspace_follow_ups(connection, id)
                )),
                self.database.with_connection(move |connection| Box::pin(
                    store::workspace_discussions(connection, id)
                )),
            )?;
        let actions = recommended_actions(
            &customer,
            &summary,
            &leads,
            &projects,
            &contracts,
            &follow_ups,
            &discussions,
        );
        let timeline = workspace_timeline(&leads, &projects, &contracts, &follow_ups, &discussions);
        Ok(
            json!({"customerId":id.to_string(),"summary":summary,"activeLeads":leads,"activeProjects":projects,"recentContracts":contracts,"recentFollowUps":follow_ups,"recentDiscussions":discussions,"recommendedActions":actions,"timeline":timeline,"generatedAt":iso(clock_now())?}),
        )
    }

    async fn owner(
        &self,
        id: &str,
        operator: &UserReadSnapshot,
    ) -> Result<store::OwnerRow, CustomersError> {
        if operator.id.to_string() == id {
            return Ok(store::OwnerRow {
                id: operator.id,
                display_name: operator.display_name.clone(),
                primary_org_unit_id: operator.primary_org_unit_id,
            });
        }
        let target = id.to_owned();
        let mut row = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::find_owner(connection, &target).await })
            })
            .await?
            .ok_or_else(|| CustomersError::NotFound(format!("Platform user {id} not found")))?;
        // A noncanonical UUID spelling causes Native findOne to query, then
        // hydrates the request's actor identity. Nullable scalar nulls retain
        // an already managed value, as in the existing user-domain read cache.
        if row.id == operator.id && row.primary_org_unit_id.is_none() {
            row.primary_org_unit_id = operator.primary_org_unit_id;
        }
        Ok(row)
    }
    async fn assert_org(&self, id: Option<&str>) -> Result<(), CustomersError> {
        let Some(id) = id else { return Ok(()) };
        let target = id.to_owned();
        if !self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::org_exists(connection, &target).await })
            })
            .await?
        {
            return Err(CustomersError::NotFound(format!("Org unit {id} not found")));
        }
        Ok(())
    }
    async fn create_owner(
        &self,
        input: &CreateCustomer,
        operator: &UserReadSnapshot,
    ) -> Result<ResolvedOwner, CustomersError> {
        let user = match &input.owner_user_id {
            Field::Missing => Some(self.owner(&operator.id.to_string(), operator).await?),
            Field::Null => None,
            Field::Value(id) => Some(self.owner(id, operator).await?),
        };
        let org = match &input.owner_org_id {
            Field::Missing => user
                .as_ref()
                .and_then(|user| user.primary_org_unit_id)
                .map(|id| id.to_string()),
            Field::Null => None,
            Field::Value(id) => Some(id.clone()),
        };
        self.assert_org(org.as_deref()).await?;
        Ok(ResolvedOwner {
            user_id: user.map(|user| user.id.to_string()),
            org_id: org,
        })
    }
    async fn update_owner(
        &self,
        customer: &CustomerSummary,
        input: &UpdateCustomer,
        operator: &UserReadSnapshot,
    ) -> Result<ResolvedOwner, CustomersError> {
        let (user_id, fallback_org) = match &input.owner_user_id {
            Field::Missing => (
                customer.owner_user_id.clone(),
                customer.owner_org_id.clone(),
            ),
            Field::Null => (None, customer.owner_org_id.clone()),
            Field::Value(id) => {
                let user = self.owner(id, operator).await?;
                (
                    Some(user.id.to_string()),
                    user.primary_org_unit_id
                        .map(|id| id.to_string())
                        .or_else(|| customer.owner_org_id.clone()),
                )
            }
        };
        let org_id = match &input.owner_org_id {
            Field::Missing => fallback_org,
            Field::Null => None,
            Field::Value(id) => Some(id.clone()),
        };
        self.assert_org(org_id.as_deref()).await?;
        Ok(ResolvedOwner { user_id, org_id })
    }

    pub async fn create(
        &self,
        input: CreateCustomer,
        operator: &UserReadSnapshot,
        pending: Option<&SessionFlush>,
    ) -> Result<CustomerSummary, CustomersError> {
        // The original operator findOne reuses the actor read by authentication.
        // All owner/org validation completes before either transaction or number.
        let owner = self.create_owner(&input, operator).await?;
        let operator_id = operator.id;
        let at = clock_now();
        let legal_name = nullable_text(&input.legal_name);
        let short_name = nullable_text(&input.short_name);
        let source_channel = nullable_text(&input.source_channel);
        let remark = nullable_text(&input.remark);
        let display_db = input.display_name.to_utf8_lossy();
        let normalized_db = normalize_name(&input.display_name).to_utf8_lossy();
        let legal_db = legal_name.as_ref().map(JsString::to_utf8_lossy);
        let short_db = short_name.as_ref().map(JsString::to_utf8_lossy);
        let source_db = source_channel.as_ref().map(JsString::to_utf8_lossy);
        let remark_db = remark.as_ref().map(JsString::to_utf8_lossy);
        let owner_org_db = owner.org_id.clone();
        let owner_user_db = parse_optional_uuid(owner.user_id.as_deref())?;
        let pending = pending.cloned();
        let numbers = BusinessNumberService::new(self.database.clone());
        let created = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<Result<CreatedCustomer, CustomersError>, sqlx::Error> =
                        async {
                            // Corrective 4fda3a1a: BEGIN owns customer/alias/session only.
                            // Native calls the counter on another pool connection here;
                            // successful allocation survives any following business rollback.
                            let customer_no =
                                match numbers.next(BusinessNumberScope::Customer, Some(at)).await {
                                    Ok(number) => number,
                                    Err(BusinessNumberError::Database(error)) => {
                                        return Ok(Err(CustomersError::Database(error)));
                                    }
                                };
                            let id = random_uuid()?;
                            let created_at = clock_now();
                            let updated_at = clock_now();
                            let customer = store::NewCustomer {
                                id,
                                customer_no: customer_no.clone(),
                                display_name: display_db,
                                legal_name: legal_db,
                                short_name: short_db,
                                owner_org_id: owner_org_db,
                                owner_user_id: owner_user_db,
                                source_channel: source_db,
                                remark: remark_db,
                                created_at,
                                updated_at,
                                operator_id,
                            };
                            let alias = store::NewAlias {
                                customer_id: id,
                                alias_name: customer.display_name.clone(),
                                alias_type: CustomerAliasType::Alias.as_str().to_owned(),
                                normalized_name: normalized_db,
                                is_primary: true,
                                created_at: clock_now(),
                                created_by: Some(operator_id),
                            };
                            let row_version =
                                store::insert_customer(&mut transaction, &customer).await?;
                            store::insert_alias(&mut transaction, &alias).await?;
                            if let Some(pending) = pending.as_ref() {
                                flush_managed_session(&mut transaction, pending).await?;
                            }
                            Ok(Ok(CreatedCustomer {
                                id,
                                customer_no,
                                row_version,
                                created_at,
                                updated_at,
                            }))
                        }
                        .await;
                    match result {
                        Ok(Ok(created)) => {
                            transaction.commit().await?;
                            Ok(Ok(created))
                        }
                        Ok(Err(error)) => {
                            transaction.rollback().await?;
                            Ok(Err(error))
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Err(error)
                        }
                    }
                })
            })
            .await??;
        Ok(CustomerSummary {
            id: created.id.to_string(),
            customer_no: created.customer_no,
            display_name: input.display_name,
            legal_name,
            short_name,
            status: CustomerStatus::Active.as_str().to_owned(),
            owner_org_id: owner.org_id,
            owner_user_id: owner.user_id,
            source_channel,
            remark,
            merged_into_customer_id: None,
            row_version: created.row_version,
            created_at: iso(created.created_at)?,
            created_by: Some(operator_id.to_string()),
            updated_at: iso(created.updated_at)?,
            updated_by: Some(operator_id.to_string()),
        })
    }
    pub async fn update(
        &self,
        id: &str,
        input: UpdateCustomer,
        operator: &UserReadSnapshot,
        pending: Option<&SessionFlush>,
    ) -> Result<CustomerDetailView, CustomersError> {
        let mut row = self.require_customer(id).await?;
        if row.status == CustomerStatus::Merged.as_str() {
            return Err(CustomersError::BadRequest(format!(
                "Customer {id} is merged and cannot be edited directly"
            )));
        }
        let before = summary(&row)?;
        let mut customer = before.clone();
        if let Some(value) = &input.display_name {
            customer.display_name = value.clone();
        }
        apply_text(&mut customer.legal_name, &input.legal_name);
        apply_text(&mut customer.short_name, &input.short_name);
        if let Some(value) = &input.status {
            customer.status = value.clone();
        }
        apply_text(&mut customer.source_channel, &input.source_channel);
        apply_text(&mut customer.remark, &input.remark);
        if !input.owner_user_id.is_missing() || !input.owner_org_id.is_missing() {
            let owner = self.update_owner(&customer, &input, operator).await?;
            customer.owner_user_id = owner.user_id;
            customer.owner_org_id = owner.org_id;
        }
        customer.updated_by = Some(operator.id.to_string());
        let changes = customer_changes(&before, &customer)?;
        if !changes.is_empty() || pending.is_some() {
            let dirty = !changes.is_empty();
            let target = row.id;
            let expected = row.row_version;
            let updated_at = clock_now();
            let pending = pending.cloned();
            let version = self
                .database
                .with_connection(move |connection| {
                    Box::pin(async move {
                        let mut transaction = connection.begin().await?;
                        let result: Result<Option<i32>, sqlx::Error> = async {
                            if let Some(pending) = pending.as_ref() {
                                flush_managed_session(&mut transaction, pending).await?;
                            }
                            if dirty {
                                Ok(Some(
                                    store::update_customer(
                                        &mut transaction,
                                        target,
                                        expected,
                                        &changes,
                                        updated_at,
                                    )
                                    .await?,
                                ))
                            } else {
                                Ok(None)
                            }
                        }
                        .await;
                        match result {
                            Ok(version) => {
                                transaction.commit().await?;
                                Ok(version)
                            }
                            Err(error) => {
                                transaction.rollback().await?;
                                Err(error)
                            }
                        }
                    })
                })
                .await?;
            if let Some(version) = version {
                customer.row_version = version;
                customer.updated_at = iso(updated_at)?;
            }
        }
        // The original lower-case identity lookup reuses the managed entity.
        // A noncanonical UUID spelling re-queries and hydrates it from the DB.
        if row.id.to_string() != id {
            return self.get(id).await;
        }
        row.owner_user_id = parse_optional_uuid(customer.owner_user_id.as_deref())?;
        row.owner_org_id = parse_optional_uuid(customer.owner_org_id.as_deref())?;
        self.detail_with_summary(&row, customer).await
    }
    pub async fn create_alias(
        &self,
        id: &str,
        input: CreateCustomerAlias,
        operator: Uuid,
        pending: Option<&SessionFlush>,
    ) -> Result<CustomerAliasSummary, CustomersError> {
        let customer = self.require_customer(id).await?;
        if customer.status == CustomerStatus::Merged.as_str() {
            return Err(CustomersError::BadRequest(format!(
                "Customer {id} is merged and cannot accept new aliases"
            )));
        }
        let normalized = normalize_name(&input.alias_name);
        let alias_type = input
            .alias_type
            .unwrap_or_else(|| CustomerAliasType::Alias.as_str().to_owned());
        let created_at = clock_now();
        let alias = store::NewAlias {
            customer_id: customer.id,
            alias_name: input.alias_name.to_utf8_lossy(),
            alias_type: alias_type.clone(),
            normalized_name: normalized.to_utf8_lossy(),
            is_primary: false,
            created_at,
            created_by: Some(operator),
        };
        let pending = pending.cloned();
        let alias_id = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<Uuid, sqlx::Error> = async {
                        let id = store::insert_alias(&mut transaction, &alias).await?;
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        Ok(id)
                    }
                    .await;
                    match result {
                        Ok(id) => {
                            transaction.commit().await?;
                            Ok(id)
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Err(error)
                        }
                    }
                })
            })
            .await?;
        Ok(CustomerAliasSummary {
            id: alias_id.to_string(),
            customer_id: customer.id.to_string(),
            alias_name: input.alias_name,
            alias_type,
            normalized_name: normalized,
            is_primary: false,
            created_at: iso(created_at)?,
            created_by: Some(operator.to_string()),
        })
    }
    pub async fn delete_alias(
        &self,
        id: &str,
        operator: Uuid,
        request_id: Option<String>,
        pending: Option<&SessionFlush>,
    ) -> Result<(), CustomersError> {
        let target = id.to_owned();
        let pending = pending.cloned();
        self.database.with_connection(move|connection|Box::pin(async move {
            let mut transaction=connection.begin().await?;
            let result:Result<Result<(),CustomersError>,sqlx::Error>=async {
                let Some(alias)=store::find_alias(&mut transaction,&target).await? else {return Ok(Err(CustomersError::NotFound(format!("Customer alias {target} not found"))))};
                let customer_id=alias.customer_id.to_string();
                let Some(customer)=store::find_customer(&mut transaction,&customer_id).await? else {return Ok(Err(CustomersError::NotFound(format!("Customer {customer_id} not found"))))};
                if alias.is_primary {return Ok(Err(CustomersError::Conflict(format!("Primary customer alias {target} cannot be deleted"))))}
                if customer.status==CustomerStatus::Merged.as_str() {return Ok(Err(CustomersError::Conflict(format!("Customer {customer_id} is merged and its aliases cannot be deleted"))))}
                let created_at=js_iso_string(alias.created_at).map_err(|_|sqlx::Error::Protocol("invalid customer alias audit date".to_owned()))?;
                let audit=AuditLogInput {
                    event_type:"customer.alias.deleted".into(),target_type:EntityAuditTargetType::Customer.as_str().into(),target_id:customer_id,
                    operator_id:Some(operator),request_id,result:AuditResult::Success,
                    before_snapshot:Some(json!({"aliasId":alias.id.to_string(),"aliasName":alias.alias_name,"aliasType":alias.alias_type,"normalizedName":alias.normalized_name,"isPrimary":alias.is_primary,"createdAt":created_at,"createdBy":alias.created_by.map(|id|id.to_string())})),
                    after_snapshot:None,metadata:Some(json!({"sourceCommand":"delete-customer-alias"})),..AuditLogInput::default()
                };
                // Native report01: audit CREATE, managed session UPDATE, then
                // alias DELETE. A zero-row delete after a competing commit is
                // deliberately successful; the two witnessed requests are 204.
                audit::insert_audit_log(&mut transaction,&audit).await?;
                if let Some(pending)=pending.as_ref() {flush_managed_session(&mut transaction,pending).await?;}
                store::delete_alias(&mut transaction,alias.id).await?;
                Ok(Ok(()))
            }.await;
            match result {
                Ok(Ok(()))=>{transaction.commit().await?;Ok(Ok(()))},
                Ok(Err(error))=>{transaction.rollback().await?;Ok(Err(error))},
                Err(error)=>{transaction.rollback().await?;Err(error)},
            }
        })).await?
    }
}

struct ResolvedOwner {
    user_id: Option<String>,
    org_id: Option<String>,
}
struct CreatedCustomer {
    id: Uuid,
    customer_no: String,
    row_version: i32,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}

fn random_uuid() -> Result<Uuid, sqlx::Error> {
    let mut bytes = [0_u8; 16];
    getrandom::fill(&mut bytes)
        .map_err(|_| sqlx::Error::Protocol("customer UUID generation failed".into()))?;
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    Ok(Uuid::from_bytes(bytes))
}

fn parse_optional_uuid(value: Option<&str>) -> Result<Option<Uuid>, CustomersError> {
    value
        .map(|value| Uuid::parse_str(value).map_err(|_| CustomersError::Internal))
        .transpose()
}
fn nullable_text(value: &Field<JsString>) -> Option<JsString> {
    match value {
        Field::Value(value) => {
            let value = super::validation::trim(value.clone());
            (!value.is_empty()).then_some(value)
        }
        Field::Missing | Field::Null => None,
    }
}
fn apply_text(target: &mut Option<JsString>, value: &Field<JsString>) {
    if !value.is_missing() {
        *target = nullable_text(value);
    }
}
fn changed_text(before: &Option<JsString>, after: &Option<JsString>) -> Option<Option<String>> {
    (before != after).then(|| after.as_ref().map(JsString::to_utf8_lossy))
}
fn customer_changes(
    before: &CustomerSummary,
    after: &CustomerSummary,
) -> Result<store::CustomerChanges, CustomersError> {
    Ok(store::CustomerChanges {
        display_name: (before.display_name != after.display_name)
            .then(|| after.display_name.to_utf8_lossy()),
        legal_name: changed_text(&before.legal_name, &after.legal_name),
        short_name: changed_text(&before.short_name, &after.short_name),
        status: (before.status != after.status).then(|| after.status.clone()),
        owner_org_id: (before.owner_org_id != after.owner_org_id)
            .then(|| after.owner_org_id.clone()),
        owner_user_id: if before.owner_user_id != after.owner_user_id {
            Some(parse_optional_uuid(after.owner_user_id.as_deref())?)
        } else {
            None
        },
        source_channel: changed_text(&before.source_channel, &after.source_channel),
        remark: changed_text(&before.remark, &after.remark),
        updated_by: if before.updated_by != after.updated_by {
            Some(parse_optional_uuid(after.updated_by.as_deref())?)
        } else {
            None
        },
    })
}

#[derive(Default)]
struct ListContext {
    users: HashMap<Uuid, String>,
    orgs: HashMap<String, String>,
    leads: HashMap<Uuid, i64>,
    projects: HashMap<Uuid, i64>,
    contracts: HashMap<Uuid, i64>,
}
impl ListContext {
    fn view(&self, customer: CustomerSummary) -> Result<CustomerListView, CustomersError> {
        let id = Uuid::parse_str(&customer.id).map_err(|_| CustomersError::Internal)?;
        Ok(CustomerListView {
            owner_name: customer
                .owner_user_id
                .as_deref()
                .and_then(|id| Uuid::parse_str(id).ok())
                .and_then(|id| self.users.get(&id))
                .cloned(),
            owner_org_name: customer
                .owner_org_id
                .as_ref()
                // Native's context Map uses DB-canonical string keys. A
                // managed uppercase ownerOrgId deliberately misses until GET
                // hydrates the customer from its persisted canonical UUID.
                .and_then(|id| self.orgs.get(id))
                .cloned(),
            lead_count: *self.leads.get(&id).unwrap_or(&0),
            project_count: *self.projects.get(&id).unwrap_or(&0),
            contract_count: *self.contracts.get(&id).unwrap_or(&0),
            customer,
        })
    }
}
fn iso(value: chrono::DateTime<chrono::Utc>) -> Result<String, CustomersError> {
    js_iso_string(value).map_err(|_| CustomersError::Internal)
}
fn summary(row: &CustomerRow) -> Result<CustomerSummary, CustomersError> {
    Ok(CustomerSummary {
        id: row.id.to_string(),
        customer_no: row.customer_no.clone(),
        display_name: model::text(&row.display_name),
        legal_name: row.legal_name.as_deref().map(model::text),
        short_name: row.short_name.as_deref().map(model::text),
        status: row.status.clone(),
        owner_org_id: row.owner_org_id.map(|id| id.to_string()),
        owner_user_id: row.owner_user_id.map(|id| id.to_string()),
        source_channel: row.source_channel.as_deref().map(model::text),
        remark: row.remark.as_deref().map(model::text),
        merged_into_customer_id: row.merged_into_customer_id.map(|id| id.to_string()),
        row_version: row.row_version,
        created_at: iso(row.created_at)?,
        created_by: row.created_by.map(|id| id.to_string()),
        updated_at: iso(row.updated_at)?,
        updated_by: row.updated_by.map(|id| id.to_string()),
    })
}
fn alias_summary(row: &AliasRow) -> Result<CustomerAliasSummary, CustomersError> {
    Ok(CustomerAliasSummary {
        id: row.id.to_string(),
        customer_id: row.customer_id.to_string(),
        alias_name: model::text(&row.alias_name),
        alias_type: row.alias_type.clone(),
        normalized_name: model::text(&row.normalized_name),
        is_primary: row.is_primary,
        created_at: iso(row.created_at)?,
        created_by: row.created_by.map(|id| id.to_string()),
    })
}
/// JS /\s+/g and default-locale lowercasing, preserving isolated surrogates.
fn normalize_name(value: &JsString) -> JsString {
    let value = super::validation::trim(value.clone());
    let mut collapsed = Vec::new();
    let mut previous_space = false;
    for unit in value.as_code_units() {
        if super::validation::whitespace(*unit) {
            if !previous_space {
                collapsed.push(32)
            }
            previous_space = true;
        } else {
            collapsed.push(*unit);
            previous_space = false;
        }
    }
    let mapper = icu_casemap::CaseMapper::new();
    let language = icu_locale_core::langid!("und");
    let mut result = Vec::new();
    let mut chunk = String::new();
    let flush = |chunk: &mut String, result: &mut Vec<u16>| {
        result.extend(mapper.lowercase_to_string(chunk, &language).encode_utf16());
        chunk.clear();
    };
    for value in char::decode_utf16(collapsed) {
        match value {
            Ok(value) => chunk.push(value),
            Err(error) => {
                flush(&mut chunk, &mut result);
                result.push(error.unpaired_surrogate());
            }
        }
    }
    flush(&mut chunk, &mut result);
    JsString::from_code_units(result)
}
fn text(value: &Value, key: &str) -> String {
    value[key].as_str().unwrap_or_default().to_owned()
}
fn recommended_actions(
    customer: &CustomerRow,
    summary: &Value,
    leads: &[Value],
    projects: &[Value],
    contracts: &[Value],
    follow_ups: &[Value],
    discussions: &[Value],
) -> Vec<Value> {
    let mut actions = Vec::new();
    let lead_count = summary["activeLeadCount"].as_i64().unwrap_or_default();
    let project_count = summary["activeProjectCount"].as_i64().unwrap_or_default();
    let contract_count = summary["contractCount"].as_i64().unwrap_or_default();
    if lead_count > 0 {
        let first = leads.first().unwrap_or(&Value::Null);
        actions.push(json!({"key":"review-active-leads","intent":"open-leads","title":"处理活跃线索","description":format!("当前有 {lead_count} 条活跃线索需要推进，优先查看最近更新的线索。"),"targetObjectType":"lead","targetObjectId":first["id"],"targetTitle":first["leadName"],"priority":10}));
    }
    if project_count > 0 {
        let first = projects.first().unwrap_or(&Value::Null);
        actions.push(json!({"key":"advance-active-projects","intent":"open-project-workspace","title":"推进进行中项目","description":format!("当前有 {project_count} 个进行中项目，优先处理最近更新的项目。"),"targetObjectType":"project","targetObjectId":first["id"],"targetTitle":first["projectName"],"priority":20}));
    }
    if contract_count > 0 {
        let first = contracts.first().unwrap_or(&Value::Null);
        actions.push(json!({"key":"review-recent-contracts","intent":"open-contract","title":"复核近期合同","description":format!("当前有 {contract_count} 份合同记录，查看最近合同状态与项目承接。"),"targetObjectType":"contract","targetObjectId":first["id"],"targetTitle":first["contractNo"],"priority":30}));
    }
    actions.push(json!({"key":"record-follow-up","intent":"record-follow-up","title":if follow_ups.is_empty(){"补充客户跟进"}else{"记录下一次跟进"},"description":if follow_ups.is_empty(){"当前还没有客户级跟进记录，先补齐第一条互动事实。"}else{"沿着最近一次客户沟通继续记录后续动作。"},"targetObjectType":"customer","targetObjectId":customer.id.to_string(),"targetTitle":customer.display_name,"priority":40}));
    actions.push(json!({"key":"capture-discussion","intent":"capture-discussion","title":if discussions.is_empty(){"补充客户讨论"}else{"沉淀关键讨论"},"description":if discussions.is_empty(){"当前还没有客户级讨论记录，先补齐关键背景和共识。"}else{"把最新共识沉淀到客户讨论，便于跨项目延续。"},"targetObjectType":"customer","targetObjectId":customer.id.to_string(),"targetTitle":customer.display_name,"priority":50}));
    actions.truncate(5);
    actions
}
fn workspace_timeline(
    leads: &[Value],
    projects: &[Value],
    contracts: &[Value],
    follow_ups: &[Value],
    discussions: &[Value],
) -> Vec<Value> {
    let mut timeline = Vec::new();
    for lead in leads {
        timeline.push(json!({"key":format!("lead:{}",text(lead,"id")),"eventType":"lead-updated","sourceType":"lead","sourceId":lead["id"],"occurredAt":lead["updatedAt"],"title":lead["leadName"],"description":format!("{} · {} · {} · {}",text(lead,"leadNo"),text(lead,"status"),text(lead,"rating"),text(lead,"urgency")),"actorName":lead["ownerName"],"targetObjectType":"lead","targetObjectId":lead["id"],"targetTitle":lead["leadName"],"isKey":lead["rating"]=="A"||lead["urgency"]=="high"}));
    }
    for project in projects {
        timeline.push(json!({"key":format!("project:{}",text(project,"id")),"eventType":"project-updated","sourceType":"project","sourceId":project["id"],"occurredAt":project["updatedAt"],"title":project["projectName"],"description":format!("{} · {} · {}",text(project,"projectNo"),text(project,"status"),text(project,"currentStage")),"actorName":project["ownerName"],"targetObjectType":"project","targetObjectId":project["id"],"targetTitle":project["projectName"],"isKey":true}));
    }
    for contract in contracts {
        timeline.push(json!({"key":format!("contract:{}",text(contract,"id")),"eventType":"contract-updated","sourceType":"contract","sourceId":contract["id"],"occurredAt":contract["updatedAt"],"title":contract["contractNo"],"description":format!("{} · {}",text(contract,"projectName"),text(contract,"status")),"actorName":null,"targetObjectType":"contract","targetObjectId":contract["id"],"targetTitle":contract["contractNo"],"isKey":contract["status"]=="active"}));
    }
    for follow_up in follow_ups {
        let next = follow_up["nextFollowUpAt"]
            .as_str()
            .map(|date| format!("下次跟进 {date}"));
        timeline.push(json!({"key":format!("follow-up:{}",text(follow_up,"id")),"eventType":"follow-up-recorded","sourceType":"follow-up","sourceId":follow_up["id"],"occurredAt":follow_up["occurredAt"],"title":follow_up["summary"],"description":next,"actorName":follow_up["ownerName"],"targetObjectType":"follow-up","targetObjectId":follow_up["id"],"targetTitle":follow_up["summary"],"isKey":false}));
    }
    for discussion in discussions {
        timeline.push(json!({"key":format!("discussion:{}",text(discussion,"id")),"eventType":"discussion-added","sourceType":"discussion","sourceId":discussion["id"],"occurredAt":discussion["createdAt"],"title":discussion["targetTitle"],"description":discussion["body"],"actorName":null,"targetObjectType":"discussion","targetObjectId":discussion["id"],"targetTitle":discussion["targetTitle"],"isKey":discussion["isKeyConclusion"]}));
    }
    let time = |value: &Value| {
        chrono::DateTime::parse_from_rfc3339(value["occurredAt"].as_str().unwrap_or_default())
            .map(|date| date.timestamp_millis())
            .unwrap_or(i64::MIN)
    };
    timeline.sort_by_key(|item| std::cmp::Reverse(time(item)));
    timeline.truncate(12);
    timeline
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn timeline_keeps_source_order_at_equal_millisecond_timestamps() {
        let date = "2026-11-01T00:00:00.000Z";
        let leads = vec![
            json!({"id":"lead","updatedAt":date,"leadName":"lead","leadNo":"LD","status":"qualified","rating":"A","urgency":"normal","ownerName":null}),
        ];
        let projects = vec![
            json!({"id":"project","updatedAt":date,"projectName":"project","projectNo":"PRJ","status":"active","currentStage":"assessment","ownerName":null}),
        ];
        let actual = workspace_timeline(&leads, &projects, &[], &[], &[]);
        assert_eq!(actual[0]["key"], "lead:lead");
        assert_eq!(actual[1]["key"], "project:project");
    }
    #[test]
    fn alias_normalization_keeps_js_whitespace_and_contextual_case_rules() {
        assert_eq!(
            normalize_name(&model::text(" \u{feff}ΟΣ\t\nİ  NAME \u{feff}")).to_utf8_lossy(),
            "ος i\u{307} name"
        );
        assert_eq!(
            normalize_name(&model::text(" A\u{85}B ")).to_utf8_lossy(),
            "a\u{85}b"
        );
        assert_eq!(
            normalize_name(&JsString::from_code_units(vec![0xd800, 32, 65])).as_code_units(),
            &[0xd800, 32, 97]
        );
    }
}
