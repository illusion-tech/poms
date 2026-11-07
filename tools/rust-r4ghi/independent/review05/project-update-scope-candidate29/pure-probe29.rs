// Exact extracted policy/status functions with minimal standalone value adapters.
// This is not crate/PG/HTTP acceptance.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ProjectAction {
    ReadProjectAnchorOrIList,
    ReadOwnCompletionTask,
    ReadProjectAnchor,
    UpdateProjectMetadata,
    ReadCommissionAssignment,
    CreateCommissionAssignmentDraft,
    FreezeCommissionAssignment,
    PrepareHandover,
    ConfirmHandoverSelf,
    ParticipantConfirm,
    FinalizeHandover,
    HandoverFinalize,
    RebaselineHandover,
    StartExecution,
    StartAcceptanceConfirmAcceptanceConfirmCompletion,
    CreateReplaceVoidArchive,
    CloseCompletionCondition,
    ReassignCurrentOwner,
    FirstAssignOwner,
    OwnerReassign,
    OperatingRead,
    OperatingWrite,
}

impl ProjectAction {
    fn permission(self) -> &'static str {
        match self {
            Self::ReadCommissionAssignment
            | Self::CreateCommissionAssignmentDraft
            | Self::FreezeCommissionAssignment => "commission:assignments:manage",
            Self::OperatingRead | Self::OperatingWrite => "contract:finance:manage",
            Self::ReadProjectAnchorOrIList
            | Self::ReadOwnCompletionTask
            | Self::ReadProjectAnchor
            | Self::ConfirmHandoverSelf
            | Self::ParticipantConfirm => "project:read",
            _ => "project:write",
        }
    }
}

#[derive(Debug)]
enum Error { NotFound(String), Forbidden(String) }

fn missing() -> Error {
    Error::NotFound("Project resource not found".into())
}

fn denied() -> Error {
    Error::Forbidden("Current project responsibility does not permit this action".into())
}

fn needs_bootstrap(action: ProjectAction) -> bool {
    matches!(
        action,
        ProjectAction::ReadProjectAnchor
            | ProjectAction::FirstAssignOwner
            | ProjectAction::OwnerReassign
    )
}

fn metadata_owner_gate(
    action: ProjectAction,
    permitted: bool,
    owner_read: bool,
    owner_write: bool,
    legacy_owner_anchor: bool,
) -> Result<(), Error> {
    if action != ProjectAction::UpdateProjectMetadata {
        return Ok(());
    }
    if !permitted {
        return Err(denied());
    }
    if !owner_write {
        return Err(if owner_read || legacy_owner_anchor {
            denied()
        } else {
            missing()
        });
    }
    Ok(())
}

fn owner_suffices(action: ProjectAction, owner_read: bool, owner_write: bool) -> bool {
    match action {
        ProjectAction::ReadProjectAnchorOrIList
        | ProjectAction::ReadOwnCompletionTask
        | ProjectAction::ReadProjectAnchor
        | ProjectAction::ReadCommissionAssignment
        | ProjectAction::OperatingRead => owner_read,
        ProjectAction::UpdateProjectMetadata
        | ProjectAction::CreateCommissionAssignmentDraft
        | ProjectAction::FreezeCommissionAssignment
        | ProjectAction::PrepareHandover
        | ProjectAction::FinalizeHandover
        | ProjectAction::HandoverFinalize
        | ProjectAction::RebaselineHandover
        | ProjectAction::CreateReplaceVoidArchive
        | ProjectAction::ReassignCurrentOwner
        | ProjectAction::OwnerReassign
        | ProjectAction::OperatingWrite => owner_write,
        _ => false,
    }
}

#[test]
fn metadata_edit_requires_permission_and_current_verified_owner_write() {
        let action = ProjectAction::UpdateProjectMetadata;
        assert_eq!(action.permission(), "project:write");
        assert!(!needs_bootstrap(action));
        assert!(metadata_owner_gate(action, true, true, true, false).is_ok());
        assert!(matches!(
            metadata_owner_gate(action, false, true, true, false),
            Err(Error::Forbidden(_))
        ));
        assert!(matches!(
            metadata_owner_gate(action, true, true, false, false),
            Err(Error::Forbidden(_))
        ));
        assert!(matches!(
            metadata_owner_gate(action, true, false, false, true),
            Err(Error::Forbidden(_))
        ));
        assert!(matches!(
            metadata_owner_gate(action, true, false, false, false),
            Err(Error::NotFound(_))
        ));
        assert!(!owner_suffices(action, true, false));
        assert!(owner_suffices(action, true, true));
    }

#[derive(Clone, Copy)]
enum Operation {
    List,
    Create,
    Get,
    Update,
    Reassign,
    Lookup,
}

#[derive(Debug, PartialEq, Eq)]
enum StatusCode { Ok, Created }
impl StatusCode { const OK:Self=Self::Ok; const CREATED:Self=Self::Created; }

fn success_status(operation: Operation) -> StatusCode {
    if matches!(operation, Operation::Create) {
        StatusCode::CREATED
    } else {
        StatusCode::OK
    }
}

#[test]
fn canonical_success_status_distinguishes_creation_from_updates_and_reassignment() {
        assert_eq!(success_status(Operation::Create), StatusCode::CREATED);
        for operation in [
            Operation::List,
            Operation::Get,
            Operation::Lookup,
            Operation::Update,
            Operation::Reassign,
        ] {
            assert_eq!(success_status(operation), StatusCode::OK);
        }
    }
