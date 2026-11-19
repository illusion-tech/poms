import {
    LEAD_WORKBENCH_SCOPE_DEFINITIONS,
    LeadGateStatusValue,
    LeadStatusValue,
    LeadWorkbenchScopeHint,
    LeadWorkbenchScopeLabel,
    LeadWorkbenchScopeSeverity,
    LeadWorkbenchScopeValue,
    type LeadWorkbenchFacet,
    type LeadWorkbenchScope,
    type LeadWorkbenchSummary
} from '@poms/shared-contracts';
import { buildLeadGateSummary, type LeadGateInput } from './lead-scoring';

export function resolveLeadWorkbenchScopes(input: LeadGateInput): LeadWorkbenchScope[] {
    const scopes = new Set<LeadWorkbenchScope>([LeadWorkbenchScopeValue.All]);

    if (input.status === LeadStatusValue.Converted || input.convertedProjectId) {
        scopes.add(LeadWorkbenchScopeValue.Converted);
        return [...scopes];
    }

    if (input.status === LeadStatusValue.Closed) {
        scopes.add(LeadWorkbenchScopeValue.Closed);
        return [...scopes];
    }

    if (input.status === LeadStatusValue.Registered) {
        scopes.add(LeadWorkbenchScopeValue.Active);
        scopes.add(LeadWorkbenchScopeValue.Registered);
        return [...scopes];
    }

    if (input.status === LeadStatusValue.Qualified) {
        scopes.add(LeadWorkbenchScopeValue.Active);
        scopes.add(LeadWorkbenchScopeValue.Qualified);
        scopes.add(buildLeadGateSummary(input).conversion.status === LeadGateStatusValue.Ready ? LeadWorkbenchScopeValue.ReadyToConvert : LeadWorkbenchScopeValue.BlockedConversion);
    }

    return [...scopes];
}

export function leadMatchesWorkbenchScope(input: LeadGateInput, scope: LeadWorkbenchScope): boolean {
    return resolveLeadWorkbenchScopes(input).includes(scope);
}

export function buildLeadWorkbenchSummary(inputs: readonly LeadGateInput[]): LeadWorkbenchSummary {
    const summary = createEmptyLeadWorkbenchSummary();

    for (const input of inputs) {
        for (const scope of resolveLeadWorkbenchScopes(input)) {
            summary[scope] += 1;
        }
    }

    return summary;
}

export function buildLeadWorkbenchFacets(summary: LeadWorkbenchSummary): LeadWorkbenchFacet[] {
    return LEAD_WORKBENCH_SCOPE_DEFINITIONS.map((definition) => ({
        scope: definition.value,
        label: LeadWorkbenchScopeLabel[definition.value],
        hint: LeadWorkbenchScopeHint[definition.value],
        severity: LeadWorkbenchScopeSeverity[definition.value],
        count: summary[definition.value],
        order: definition.order
    }));
}

function createEmptyLeadWorkbenchSummary(): LeadWorkbenchSummary {
    return {
        active: 0,
        registered: 0,
        qualified: 0,
        'ready-to-convert': 0,
        'blocked-conversion': 0,
        converted: 0,
        closed: 0,
        all: 0
    };
}
