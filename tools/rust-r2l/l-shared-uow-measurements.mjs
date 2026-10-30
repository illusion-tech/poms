// SOURCE-only meanings of the two validation adapters' retained observations.
// This is an interpretation contract, never a value normalizer or a verdict.
const freeze = value => {
    if (value && typeof value === 'object') {
        for (const child of Object.values(value)) freeze(child);
        Object.freeze(value);
    }
    return value;
};

export const sharedUowMeasurementContract = freeze({
    formatVersion: 2,
    kind: 'explicit-original-and-Rust-UoW-measurement-meanings',
    rawObservationsRetained: true,
    crossBackendCompared: false,
    automaticStrictEqualityAllowed: false,
    pairingRule: 'Compare only explicitly paired measures on matching scenario/stage/table/owned-or-certified-typed ID. Keep every raw field and extra row. Do not erase differences or compare the whole differently shaped observations as one DTO.',
    fields: {
        'snapshot.managed': {
            counterpart: 'paired-identity-membership',
            native: 'parent em.getUnitOfWork().getIdentityMap().values().includes(the exact held entity object)',
            rust: 'CommonState.entities[the exact EntityHandle].managed',
            meaning: 'Current membership of this held binding in the caller parent identity state. A surviving helper EM reference is not membership. A newly reread object with the same PK does not reattach the old held binding.',
        },
        'snapshot.queued': {
            counterpart: 'paired-persistence-queue-state-with-runtime-specific-storage',
            native: 'parent em.getUnitOfWork().getPersistStack().has(the exact entity object)',
            rust: 'CommonState.entities[the exact EntityHandle].queued',
            meaning: 'Current scheduled-persistence membership/flag at this observed stage. It is not a dirty-field predicate, a change-set row count, an eventual SQL write or a creation certificate. Differences remain evidence.',
        },
        'snapshot.properties': {
            counterpart: 'paired-only-for-explicitly-mapped-persisted-scalar-properties',
            native: 'Original metadata persist!==false && (kind===scalar || mapToPk), sorted property names; actual held values encoded without replacing missing/undefined by null',
            rust: 'Bounded Table.columns() property projection; actual held data looked up with get(), which retains Undefined when a key is absent',
            meaning: 'Compare each explicit original-to-Rust scalar mapping and preserve extra/native-only/unmapped fields separately. These projections are not arbitrary full object own properties.',
        },
        'snapshot.original': {
            counterpart: 'paired-change-detection-snapshot-with-explicit-representation-boundary',
            native: 'WrappedEntity.__originalEntityData enumerable string-keyed values, sorted Object.keys; undefined/null container renders null in this legacy field',
            rust: 'TrackedEntity.original Option<Data>; None renders null and Some retains all Data keys and values',
            meaning: 'Actual stored change-detection snapshots, not a reread of committed DB state. Compare mapped properties, preserve all raw keys and any representation difference; helperOriginalPresence separately preserves the Native container distinction.',
        },
        'snapshot.originalOwnKeys': {
            counterpart: 'paired-enumerable-or-map-string-key-inventory-with-explicit-boundary',
            native: 'Object.keys(__originalEntityData).sort(), or [] for null/undefined; not Reflect.ownKeys and not symbols/non-enumerable keys',
            rust: 'BTreeMap<String,Value> original.keys(), or [] for None',
            meaning: 'Retain both exact inventories. Compare only the declared persisted string-key domain; never call them an unrestricted JavaScript own-key inventory or silently remove extra keys.',
        },
        'stage.managed': {
            counterpart: 'paired-current-identity-row-inventory-with-explicit-coverage-and-order-boundary',
            native: 'Snapshot each entry of actual parent IdentityMap.values(), preserving its raw order and any duplicate entry',
            rust: 'Snapshot each CommonState.entities entry whose managed flag is true, preserving its actual vector order',
            meaning: 'Native can contain entities outside the bounded common/L metadata. Rust contains only its tracked supported metadata. Pair explicitly mapped rows by table and typed identity; retain and classify extras, duplicates and order rather than asserting array equality or claiming equal total coverage.',
        },
        'stage.held': {
            counterpart: 'paired-explicit-held-bindings',
            native: 'The original object references retained by the adapter, including a separately captured returned snapshot binding',
            rust: 'The original EntityHandles retained by the example, including a separately captured returned snapshot handle',
            meaning: 'Snapshot the old binding independently of cached/fresh reread. No DB rollback or clear is assumed to rewind caller-held values.',
        },
        'cachedReread/afterClearReread': {
            counterpart: 'paired-call-site-results-not-object-reference-identity',
            native: 'Actual em.findOne results before and after em.clear()',
            rust: 'Actual store::find results before and after CommonState.clear()',
            meaning: 'Pair result values and each result binding membership. Do not infer object/handle equality merely from equal table and PK.',
        },
    },
    nativeOnly: {
        'snapshot.helperHasEm': { rustCounterpart: null, source: 'Boolean(WrappedEntity.__em)', meaning: 'Raw surviving helper reference, including after clear; not identity membership.' },
        'snapshot.helperEmIsParent': { rustCounterpart: null, source: 'WrappedEntity.__em === parent em', meaning: 'Raw helper reference equality; nested forks may change the helper reference independently of parent membership.' },
        'snapshot.managedByParent': { rustCounterpart: null, source: 'Legacy raw alias of helperEmIsParent retained from source epoch01', meaning: 'Preserved raw field only. Despite its legacy name, it is not the corrected managed measure and must not be paired with Rust managed.' },
        'snapshot.helperOriginalPresence': { rustCounterpart: null, source: 'undefined/null/typeof WrappedEntity.__originalEntityData', meaning: 'Raw Native container distinction before the legacy original:null representation.' },
        'observation.originalProvider/context/serviceSucceeded': { rustCounterpart: null, meaning: 'Original SDK adapter provenance/control fields, not equal-shaped Rust observations.' },
    },
    rustOnly: {
        'observation.connectionIdentity': { nativeCounterpart: null, meaning: 'Actual controlled-example borrowed-connection PG identity, not a Native helper EM identity.' },
        'observation.traceDiagnostics/traceIncomplete': { nativeCounterpart: null, meaning: 'Rust diagnostic trace only; Native creation evidence comes from the original SDK witness. Neither raw trace is paired as an equal DTO or replaces PG7 authority.' },
        'observation.outerError/ownershipAdmitted': { nativeCounterpart: null, meaning: 'Rust example control/diagnostic fields; preserve them without inventing Native placeholders.' },
    },
    envelopeAndClock: 'stage.at, finishedAt, generated IDs, version clocks and service errors retain each actual source representation. Pair only under a separately reviewed scenario/typed-ID/date/error policy; this contract grants no blanket clock/error equality or normalization.',
});
