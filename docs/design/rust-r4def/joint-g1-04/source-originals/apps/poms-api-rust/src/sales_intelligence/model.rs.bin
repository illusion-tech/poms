use crate::{auth::js_json::JsString, compat::json::Field};
use uuid::Uuid;

#[derive(Clone, Debug, Default)]
pub struct Query {
    pub lead_id: Option<String>,
    pub project_id: Option<String>,
}

#[derive(Clone, Debug)]
pub struct CreateStakeholder {
    pub customer_id: String,
    pub lead_id: Option<String>,
    pub project_id: Option<String>,
    pub contact_id: String,
    pub role: String,
    pub attitude: Option<String>,
    pub influence_level: Option<String>,
    pub access_level: Option<String>,
    pub focus_areas: Option<Vec<JsString>>,
    pub communication_notes: Field<JsString>,
    pub is_primary: Option<bool>,
}

#[derive(Clone, Debug)]
pub struct UpdateStakeholder {
    pub role: Option<String>,
    pub attitude: Option<String>,
    pub influence_level: Option<String>,
    pub access_level: Option<String>,
    pub focus_areas: Option<Vec<JsString>>,
    pub communication_notes: Field<JsString>,
    pub is_primary: Option<bool>,
}

#[derive(Clone, Debug)]
pub struct CreateCompetitor {
    pub customer_id: String,
    pub lead_id: Option<String>,
    pub project_id: Option<String>,
    pub competitor_name: JsString,
    pub position: Option<String>,
    pub customer_preference: Option<String>,
    pub competitor_strengths: Field<JsString>,
    pub competitor_weaknesses: Field<JsString>,
    pub our_advantages: Field<JsString>,
    pub our_risks: Field<JsString>,
    pub win_probability: Option<String>,
    pub evidence: Field<JsString>,
}

#[derive(Clone, Debug)]
pub struct UpdateCompetitor {
    pub competitor_name: Option<JsString>,
    pub position: Option<String>,
    pub customer_preference: Option<String>,
    pub competitor_strengths: Field<JsString>,
    pub competitor_weaknesses: Field<JsString>,
    pub our_advantages: Field<JsString>,
    pub our_risks: Field<JsString>,
    pub win_probability: Option<String>,
    pub evidence: Field<JsString>,
}

#[derive(Clone, Debug)]
pub struct CreateDiscovery {
    pub customer_id: String,
    pub lead_id: Option<String>,
    pub project_id: Option<String>,
    pub procurement_process: Field<JsString>,
    pub budget_source: Field<JsString>,
    pub customer_pain_points: Field<JsString>,
    pub decision_cycle: Field<JsString>,
    pub next_contact_plan: Field<JsString>,
    pub remark: Field<JsString>,
}

#[derive(Clone, Debug)]
pub struct UpdateDiscovery {
    pub procurement_process: Field<JsString>,
    pub budget_source: Field<JsString>,
    pub customer_pain_points: Field<JsString>,
    pub decision_cycle: Field<JsString>,
    pub next_contact_plan: Field<JsString>,
    pub remark: Field<JsString>,
}

/// H consumes only these facts; I commands never refresh H's stored score.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct SalesIntelligenceFacts {
    pub decision_maker_known: bool,
    pub technical_evaluator_known: bool,
    pub procurement_process_known: bool,
    pub budget_source_known: bool,
    pub competitor_known: bool,
    pub pain_point_known: bool,
    pub next_contact_known: bool,
}

/// J applies its own original nullable-anchor comparisons to this reference.
#[derive(Clone, Debug)]
pub struct CompetitorRef {
    pub id: Uuid,
    pub customer_id: Uuid,
    pub lead_id: Option<Uuid>,
    pub project_id: Option<Uuid>,
}
