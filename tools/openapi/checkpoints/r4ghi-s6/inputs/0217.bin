import { ProjectHandoverBasisSnapshot } from "./project-handover-basis-snapshot.entity";
import { Project } from "../project/project.entity";
import { Contract, ContractAmendment, ContractTermSnapshot } from "../contract/contract.entity";
import { ContractReadinessPackage } from "../contract-readiness/contract-readiness-package.entity";
import { ContractTermPreparation, ReceivablePlanVersion } from "../contract-readiness/contract-lifecycle.entity";
import { defineEntity } from '@mikro-orm/core';

const p = defineEntity.properties;

export const ProjectHandoverContractBasisSchema = defineEntity({
    name: "ProjectHandoverContractBasis",
    tableName: "project_handover_contract_basis",
    schema: 'poms',
    checks: [
        { name: "project_handover_contract_basis_amount_tax_exclusive_check", expression: "((amount_tax_exclusive > (0)::numeric))" },
        { name: "project_handover_contract_basis_amount_tax_inclusive_check", expression: "((amount_tax_inclusive > (0)::numeric))" },
        { name: "project_handover_contract_basis_currency_code_check", expression: "((length(btrim((currency_code)::text)) > 0))" },
        { name: "project_handover_contract_basis_signed_amount_check", expression: "((signed_amount > (0)::numeric))" },
        { name: "project_handover_contract_basis_source_payload_hash_check", expression: "(((source_payload_hash)::text ~ '^[0-9a-f]{64}$'::text))" }
    ],
    uniques: [
        { name: "uq_r4d_basis_contract", properties: ["basisSnapshotId","contractId"] },
        { name: "uq_r4d_basis_anchor", expression: "CREATE UNIQUE INDEX uq_r4d_basis_anchor ON poms.project_handover_contract_basis USING btree (basis_snapshot_id) WHERE is_compatibility_anchor" }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw("gen_random_uuid()").fieldName("id"),
        basisSnapshotId: () => p.manyToOne(ProjectHandoverBasisSnapshot).mapToPk().fieldName("basis_snapshot_id").createForeignKeyConstraint(false),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName("project_id").createForeignKeyConstraint(false),
        contractId: () => p.manyToOne(Contract).mapToPk().fieldName("contract_id").createForeignKeyConstraint(false),
        termSnapshotId: () => p.manyToOne(ContractTermSnapshot).mapToPk().fieldName("term_snapshot_id").createForeignKeyConstraint(false),
        readinessPackageId: () => p.manyToOne(ContractReadinessPackage).mapToPk().fieldName("readiness_package_id").createForeignKeyConstraint(false),
        preparationId: () => p.manyToOne(ContractTermPreparation).mapToPk().fieldName("preparation_id").createForeignKeyConstraint(false),
        planVersionId: () => p.manyToOne(ReceivablePlanVersion).mapToPk().fieldName("plan_version_id").createForeignKeyConstraint(false),
        contractAmendmentId: () => p.manyToOne(ContractAmendment).mapToPk().nullable().fieldName("contract_amendment_id").createForeignKeyConstraint(false),
        sourcePayloadHash: p.string().length(64).fieldName("source_payload_hash"),
        currencyCode: p.string().length(16).fieldName("currency_code"),
        signedAmount: p.string().columnType('numeric(18,2)').precision(18).scale(2).fieldName("signed_amount"),
        amountTaxInclusive: p.string().columnType('numeric(18,2)').precision(18).scale(2).fieldName("amount_tax_inclusive"),
        amountTaxExclusive: p.string().columnType('numeric(18,2)').precision(18).scale(2).fieldName("amount_tax_exclusive"),
        isCompatibilityAnchor: p.boolean().default(false).fieldName("is_compatibility_anchor")
    }
});

export class ProjectHandoverContractBasis extends ProjectHandoverContractBasisSchema.class {}

ProjectHandoverContractBasisSchema.setClass(ProjectHandoverContractBasis);
