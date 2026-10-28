use super::model::UpdateSystemSetting;
use crate::{
    dictionary::validation::{failure, integer, invalid_type, object},
    error::ApiError,
};
pub fn validate_update(raw: Option<&str>) -> Result<UpdateSystemSetting, ApiError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    if object.get("value").is_none() {
        errors.push(invalid_type(
            "number",
            "undefined",
            vec![serde_json::json!("value")],
        ));
    }
    let value = integer(&object, "value", None, &mut errors);
    let expected_version = integer(&object, "expectedVersion", Some(0), &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(UpdateSystemSetting {
        value: value.ok_or_else(ApiError::internal)?,
        expected_version,
    })
}
