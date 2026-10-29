//! Pure original-SDK checks/render vectors. No service/ORM instance or PG.
use poms_api_rust::approval_common::{
    Text, Timestamp,
    js::{Data, Value, get},
    required,
    schema::Table,
};
use serde::Deserialize;

#[derive(Deserialize)]
struct Golden {
    cases: Vec<Case>,
    scalars: Vec<Scalar>,
    #[serde(rename = "insertParams")]
    insert_params: Vec<Parameter>,
}
#[derive(Deserialize)]
struct Case {
    table: String,
    input: Value,
    message: Text,
}
#[derive(Deserialize)]
struct Scalar {
    input: Text,
    output: Text,
}
#[derive(Deserialize)]
struct Parameter {
    table: String,
    property: String,
    input: Value,
    expected: Value,
}
fn table(name: &str) -> Table {
    match name {
        "approval_record" => Table::Approval,
        "todo_item" => Table::Todo,
        "confirmation_record" => Table::Confirmation,
        "confirmation_participant" => Table::Participant,
        "approval_summary_package_definition" => Table::Definition,
        "approval_summary_snapshot" => Table::Snapshot,
        "approval_summary_field_projection" => Table::Projection,
        _ => panic!("unknown original table"),
    }
}
fn materialize(value: Value) -> Value {
    match value {
        Value::Object(values) if matches!(get(&values, "$undefined"), Value::Bool(true)) => {
            Value::Undefined
        }
        Value::Object(values) if values.contains_key("$date") => {
            let value = get(&values, "$date")
                .as_text()
                .unwrap_or_else(|| panic!("Date marker text"));
            Value::Date(Some(
                serde_json::from_str::<Timestamp>(&value.json())
                    .unwrap_or_else(|_| panic!("fixed Date")),
            ))
        }
        Value::Object(values) => Value::Object(
            values
                .into_iter()
                .map(|(key, value)| (key, materialize(value)))
                .collect(),
        ),
        value => value,
    }
}
#[test]
fn all_seven_create_required_checks_match_locked_sdk_with_raw_scalar_rendering() {
    let golden: Golden = serde_json::from_str(include_str!(
        "../../../tools/rust-r2l1/l-required-golden.json"
    ))
    .unwrap_or_else(|_| panic!("original required golden"));
    assert_eq!(golden.cases.len(), 21);
    for case in golden.cases {
        let Value::Object(input) = materialize(case.input) else {
            panic!("object fixture");
        };
        let error = required::validate(table(&case.table), &input)
            .err()
            .unwrap_or_else(|| panic!("original required failure"));
        assert_eq!(error.status, None);
        assert_eq!(error.sqlstate, None);
        assert_eq!(error.message, case.message, "table {}", case.table);
    }
    for case in golden.scalars {
        assert_eq!(Text::from(required::inspect_text(&case.input)), case.output);
    }
    for case in golden.insert_params {
        let table = table(&case.table);
        let column = table
            .columns()
            .iter()
            .find(|column| column.property == case.property)
            .unwrap_or_else(|| panic!("original column"));
        let input = materialize(case.input);
        assert_eq!(
            poms_api_rust::approval_common::store::insert_parameter(column, &input),
            materialize(case.expected)
        );
    }
}
#[test]
fn required_check_does_not_become_nullish_or_positive_string_validation() {
    let input: Data = [
        ("sourceType".into(), Value::text("")),
        ("sourceId".into(), Value::text("")),
        ("todoType".into(), Value::text("")),
        ("businessDomain".into(), Value::text("")),
        ("targetObjectType".into(), Value::text("")),
        ("targetObjectId".into(), Value::text("")),
        ("title".into(), Value::text("")),
        ("assigneeUserId".into(), Value::text("")),
        ("status".into(), Value::text("")),
        ("priority".into(), Value::text("")),
    ]
    .into_iter()
    .collect();
    // Other original validators/PG constraints still own enum/UUID/etc errors.
    assert!(required::validate(Table::Todo, &input).is_ok());
}

#[test]
fn entity_null_and_insert_default_are_distinct_stages() {
    use poms_api_rust::approval_common::{CommonState, store};
    let mut state = CommonState::default();
    let null_input: Data = [("status".into(), Value::Null)].into_iter().collect();
    let null = store::create(&mut state, Table::Definition, null_input);
    let row = store::data(&state, null).unwrap_or_else(|_| panic!("created entity"));
    assert_eq!(get(&row, "status"), &Value::Null);
    let status = Table::Definition
        .columns()
        .iter()
        .find(|column| column.property == "status")
        .unwrap_or_else(|| panic!("status column"));
    assert_eq!(
        store::insert_parameter(status, get(&row, "status")),
        Value::text("active")
    );
    assert_eq!(
        get(
            &store::data(&state, null).unwrap_or_else(|_| panic!("unmodified entity")),
            "status"
        ),
        &Value::Null
    );
    let omitted = store::create(&mut state, Table::Definition, Data::new());
    assert_eq!(
        get(
            &store::data(&state, omitted).unwrap_or_else(|_| panic!("default entity")),
            "status"
        ),
        &Value::text("active")
    );
}
