import { ProjectHandover } from "./project-handover.entity";
import { ConfirmationParticipant, ConfirmationRecord } from "../approval/confirmation-record.entity";
import { PlatformUser } from "../platform/platform-user.entity";
import { defineEntity } from '@mikro-orm/core';

const p = defineEntity.properties;

export const ProjectHandoverParticipantRoleSchema = defineEntity({
    name: "ProjectHandoverParticipantRole",
    tableName: "project_handover_participant_role",
    schema: 'poms',
    checks: [
        { name: "project_handover_participant_role_responsibility_summary_check", expression: "((length(btrim((responsibility_summary)::text)) > 0))" },
        { name: "project_handover_participant_role_role_key_check", expression: "(((role_key)::text = ANY ((ARRAY['sales-owner'::character varying, 'business-admin'::character varying, 'technical-support'::character varying, 'execution-owner'::character varying, 'finance'::character varying])::text[])))" }
    ],
    uniques: [
        { name: "uq_r4d_participant_role", properties: ["handoverId","participantUserId","roleKey"] },
        { name: "uq_r4d_handover_execution_owner", expression: "CREATE UNIQUE INDEX uq_r4d_handover_execution_owner ON poms.project_handover_participant_role USING btree (handover_id) WHERE ((role_key)::text = 'execution-owner'::text)" }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw("gen_random_uuid()").fieldName("id"),
        handoverId: () => p.manyToOne(ProjectHandover).mapToPk().fieldName("handover_id").createForeignKeyConstraint(false),
        confirmationRecordId: () => p.manyToOne(ConfirmationRecord).mapToPk().fieldName("confirmation_record_id").createForeignKeyConstraint(false),
        confirmationParticipantId: () => p.manyToOne(ConfirmationParticipant).mapToPk().fieldName("confirmation_participant_id").createForeignKeyConstraint(false),
        participantUserId: () => p.manyToOne(PlatformUser).mapToPk().fieldName("participant_user_id").foreignKeyName("project_handover_participant_role_participant_user_id_fkey").updateRule('no action').deleteRule("restrict"),
        roleKey: p.string().length(64).fieldName("role_key"),
        responsibilitySummary: p.string().length(1000).fieldName("responsibility_summary"),
        createdAt: p.datetime().columnType('timestamptz').defaultRaw("now()").fieldName("created_at"),
        createdBy: () => p.manyToOne(PlatformUser).mapToPk().fieldName("created_by").foreignKeyName("project_handover_participant_role_created_by_fkey").updateRule('no action').deleteRule("restrict")
    }
});

export class ProjectHandoverParticipantRole extends ProjectHandoverParticipantRoleSchema.class {}

ProjectHandoverParticipantRoleSchema.setClass(ProjectHandoverParticipantRole);
