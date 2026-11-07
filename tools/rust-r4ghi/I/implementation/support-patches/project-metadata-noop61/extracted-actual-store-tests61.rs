use chrono::{DateTime,Utc};
use uuid::Uuid;
#[derive(Clone, Default)]
pub struct ProjectUpdate {
    pub project_name: Option<String>,
    pub customer_id: Option<Option<Uuid>>,
    pub customer_name: Option<Option<String>>,
    pub customer_project_no: Option<Option<String>>,
    pub owner_user_id: Option<Option<Uuid>>,
    pub owner_org_id: Option<Option<Uuid>>,
    pub planned_sign_at: Option<Option<DateTime<Utc>>>,
    pub updated_by: Option<Option<Uuid>>,
}

impl ProjectUpdate {
    pub fn is_dirty(&self) -> bool {
        self.project_name.is_some()
            || self.customer_id.is_some()
            || self.customer_name.is_some()
            || self.customer_project_no.is_some()
            || self.owner_user_id.is_some()
            || self.owner_org_id.is_some()
            || self.planned_sign_at.is_some()
    }
}

#[cfg(test)]
mod metadata_update_tests {
    use super::*;

    #[test]
    fn updater_attribution_alone_is_not_a_business_change() {
        let new_owner = Uuid::from_u128(2);
        assert!(!ProjectUpdate::default().is_dirty());
        assert!(
            !ProjectUpdate {
                updated_by: Some(Some(new_owner)),
                ..Default::default()
            }
            .is_dirty()
        );
        assert!(
            !ProjectUpdate {
                updated_by: Some(None),
                ..Default::default()
            }
            .is_dirty()
        );
    }

    #[test]
    fn actual_field_changes_still_require_a_versioned_write() {
        let owner = Uuid::from_u128(2);
        let changes = [
            ProjectUpdate {
                project_name: Some("Changed project name".into()),
                ..Default::default()
            },
            ProjectUpdate {
                customer_id: Some(None),
                ..Default::default()
            },
            ProjectUpdate {
                customer_name: Some(None),
                ..Default::default()
            },
            ProjectUpdate {
                customer_project_no: Some(None),
                ..Default::default()
            },
            ProjectUpdate {
                owner_user_id: Some(Some(owner)),
                ..Default::default()
            },
            ProjectUpdate {
                owner_org_id: Some(Some(owner)),
                ..Default::default()
            },
            ProjectUpdate {
                planned_sign_at: Some(None),
                ..Default::default()
            },
        ];
        for change in changes {
            assert!(change.is_dirty());
        }
    }
}
