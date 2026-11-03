/**
 * Definition only: Root explicitly supplies all four functions and contexts.
 * No imports, runner, environment/process, launch, HTTP/DB connection, mocks,
 * route interception, page evaluate/state mutation, fixture producer or retry.
 * Existing ctx.row/todosFor/observe callbacks remain Root-owned adapters.
 *
 * runFourJourneyCell(page, {cellId, mode, actualBackend, browserPlatform,
 *   timezoneId:'Asia/Tokyo', contexts:{customer,project,lead,intelligence},
 *   definitionPins:{customer,project,lead,intelligence}}, functions)
 * functions has customerJourney/projectJourney/leadJourney/
 * intelligenceDiscussionJourney. Each pin is {file,sha256} from Root's loader.
 * No function/expectation is selected by backend. Root passes originals01 for
 * Native known-defect reference and derived02 for Rust business acceptance.
 * Independent C approval of that classification is a Root governance action,
 * never inferred from this wrapper completing.
 */
const requireThat = (value, message) => { if (!value) throw new Error(message); };
const idOf = (value) => typeof value === 'string' ? value : value?.id;
const sameId = (left, right) => typeof left === 'string' && typeof right === 'string'
    && /^[0-9a-f-]{36}$/i.test(left) && /^[0-9a-f-]{36}$/i.test(right)
    && left.toLowerCase() === right.toLowerCase();
const id = (value, name) => { const actual = idOf(value); requireThat(typeof actual === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actual), `Actual ${name} UUID required`); return actual; };
const present = (value, name) => requireThat(typeof value === 'string' && value.length > 0, `Root must supply ${name}`);

export const fourJourneyContract = Object.freeze({
    order: ['customer', 'project', 'lead', 'intelligence'],
    actualCustomerJourneyCoverage: 'existing Customer workspace + Contact create/update + FollowUp create/replace/void; NOT Customer command/alias UI',
    actualProjectJourneyCoverage: 'technical-cost read + bid/pricing UI first/second versions; NOT project-basic6',
    businessMode: 'rust-business', referenceMode: 'native-known-defect-reference',
    technicalCostUIWriteClaim: false, projectBasicSixUIClaim: false,
    timezoneId: 'Asia/Tokyo', executionByDefinitionAuthor: false,
});

export async function runFourJourneyCell(page, settings, functions) {
    requireThat(page && typeof page.getByRole === 'function', 'Root actual authenticated Playwright Page required');
    const { cellId, mode, actualBackend, browserPlatform, timezoneId, contexts, definitionPins } = settings ?? {};
    present(cellId, 'unique cellId');
    requireThat(['rust-business', 'native-known-defect-reference'].includes(mode), 'Root must explicitly classify the cell');
    requireThat(actualBackend === (mode === 'rust-business' ? 'rust' : 'native'), 'Explicit cell classification/backend must agree');
    requireThat(['linux', 'windows'].includes(browserPlatform), 'Actual browser-platform axis required');
    requireThat(timezoneId === 'Asia/Tokyo', 'Root actual browser context must use Asia/Tokyo for Lead03 nonempty date');
    const roles = fourJourneyContract.order;
    const names = { customer: 'customerJourney', project: 'projectJourney', lead: 'leadJourney', intelligence: 'intelligenceDiscussionJourney' };
    for (const role of roles) {
        requireThat(typeof functions?.[names[role]] === 'function', `Root explicit ${names[role]} function required`);
        const ctx = contexts?.[role];
        requireThat(ctx && typeof ctx.observe === 'function', `Root ${role}.observe required`);
        present(ctx.baseUrl, `${role}.baseUrl`);
        present(ctx.label, `${role}.label`);
        requireThat(ctx.ids && typeof ctx.ids === 'object', `${role}.ids required`);
        requireThat(typeof definitionPins?.[role]?.file === 'string' && /^[0-9a-f]{64}$/i.test(definitionPins?.[role]?.sha256 ?? ''), `Root actual ${role} loader file/hash pin required`);
    }
    const origins = roles.map((role) => new URL(contexts[role].baseUrl).origin);
    requireThat(origins.every((origin) => origin === origins[0]), 'One cell must keep the same actual UI/proxy origin');
    requireThat(typeof contexts.customer.row === 'function' && typeof contexts.customer.todosFor === 'function', 'Customer actual PG row/Todo readers required');
    requireThat(typeof contexts.project.row === 'function', 'Presigning actual PG row reader required');
    for (const option of ['createLead', 'scoreOverrides', 'qualifyAndConvert']) requireThat(contexts.lead.options?.[option] !== false, 'Full four-journey cell cannot silently omit a Lead branch');

    const customerId = id(contexts.customer.ids.customer, 'Customer workspace C1');
    const leadCustomer = id(contexts.lead.ids.customerId ?? contexts.lead.ids.customer, 'Lead Customer C2');
    const primaryLead = id(contexts.lead.ids.leadId ?? contexts.lead.ids.lead, 'A primary Lead L_A');
    const intelligenceCustomer = id(contexts.intelligence.ids.customer, 'IJK Customer C2');
    const registeredLead = id(contexts.intelligence.ids.lead, 'IJK registered Lead L_I');
    const intelligenceContact = id(contexts.intelligence.ids.contact, 'IJK active C2 Contact');
    requireThat(!sameId(customerId, leadCustomer), 'Empty Customer-workspace C1 must be separate from seeded Lead/IJK C2');
    requireThat(sameId(leadCustomer, intelligenceCustomer), 'Lead conversion and IJK must share actual C2');
    requireThat(!sameId(primaryLead, registeredLead), 'IJK needs separate registered L_I; A L_A will be converted');
    for (const role of ['lead', 'intelligence']) present(contexts[role].ids.customerDisplayName ?? contexts[role].ids.customer?.displayName, `${role} actual Customer display name`);
    requireThat((contexts.lead.ids.customerDisplayName ?? contexts.lead.ids.customer?.displayName) === (contexts.intelligence.ids.customerDisplayName ?? contexts.intelligence.ids.customer?.displayName), 'C2 visible display-name fixture must agree');
    present(contexts.lead.ids.sourceCode, 'active real Lead sourceCode');
    present(contexts.lead.ids.sourceName, 'unique visible Lead sourceName');
    present(contexts.intelligence.ids.contactName ?? contexts.intelligence.ids.contact?.name, 'unique visible active C2 Contact name');
    requireThat(Boolean(contexts.intelligence.ids.sourceLeadDiscussionId || contexts.intelligence.ids.sourceLeadDiscussionBody), 'Root must pin actual L_A-target discussion produced before its conversion');
    const projects = ['costProject', 'bidProject', 'pricingProject'].map((key) => id(contexts.project.ids[key], `presigning ${key}`));
    requireThat(new Set(projects.map((project) => project.toLowerCase())).size === 3, 'Readonly cost, empty bid and pricing workspaces need three separate actual Projects');
    id(contexts.project.ids.costPackage, 'pricingProject actual current cost package');
    if (contexts.project.ids.bidProcess) id(contexts.project.ids.bidProcess, 'pricingProject actual current bid');

    const completed = [], results = {}, observedKnownBusinessFailures = [];
    let projectCompletion;
    const emit = async (name, data) => contexts.customer.observe(`ui-cell.${cellId}.${name}`, data);
    const knownFailure = (role, name, data) => {
        if (!data || typeof data !== 'object') return;
        let pathname;
        try { pathname = typeof data.url === 'string' ? new URL(data.url).pathname : null; } catch { pathname = null; }
        if (role === 'customer' && data.method === 'POST' && pathname === '/api/customer-contacts'
            && data.status === 201 && data.requestBody?.gender === 'female' && data.body?.gender === 'unknown') {
            observedKnownBusinessFailures.push({ code: 'Native.Contact.CreateGenderDropped', observedAt: name, contactId: data.body.id, requestedGender: 'female', returnedGender: 'unknown', BusinessCorrect: false });
        }
        if (role === 'project' && data.method === 'POST' && data.status === 500
            && /\.(bid|pricing)\.second\.post\.HTTP$/.test(name)) {
            observedKnownBusinessFailures.push({ code: name.includes('.bid.second.') ? 'Native.Bid.LegalSecondVersion500' : 'Native.Pricing.LegalSecondVersion500', observedAt: name, path: pathname, actualStatus: 500, requiredBusinessStatus: 201, BusinessCorrect: false });
        }
    };
    const contextFor = (role, extra = {}) => {
        const original = contexts[role];
        return {
            ...original, ids: { ...original.ids, ...(extra.ids ?? {}) },
            ...(role === 'lead' ? { timezoneId, options: { ...original.options } } : {}),
            observe: async (name, data) => {
                knownFailure(role, name, data);
                if (role === 'project' && name.endsWith('projectJourney.complete')) projectCompletion = data;
                await original.observe(`ui-cell.${cellId}.${role}.${name}`, data);
            },
        };
    };
    let stage = 'preconditions';
    try {
        await emit('definition-and-fixtures', { mode, actualBackend, browserPlatform, timezoneId, definitionPins,
            customerWorkspaceId: customerId, leadAndIntelligenceCustomerId: leadCustomer, primaryLeadId: primaryLead,
            registeredIntelligenceLeadId: registeredLead, intelligenceContactId: intelligenceContact,
            projectIds: projects, projectJourneyCoverage: fourJourneyContract.actualProjectJourneyCoverage,
            projectBasicSixUIClaim: false, selectorsOrExpectedStatusesRewrittenByWrapper: false });
        stage = 'customer';
        results.customer = await functions.customerJourney(page, contextFor('customer'));
        requireThat(sameId(results.customer?.customerId, customerId), 'Customer journey must return its actual C1 IDs');
        id(results.customer.contactId, 'actual C1 UI-created Contact');
        completed.push(stage);

        stage = 'project';
        const returned = await functions.projectJourney(page, contextFor('project'));
        // Original01 is void and records a real completion observation;02
        // additionally returns actual IDs. This adapts a declared return
        // contract, never a failed action, HTTP response or prepared row.
        requireThat(returned || projectCompletion, 'Presigning journey needs actual successful completion evidence');
        results.project = returned ?? projectCompletion;
        completed.push(stage);

        stage = 'lead';
        results.lead = await functions.leadJourney(page, contextFor('lead'));
        requireThat(sameId(results.lead?.preparedLeadId, primaryLead), 'Lead journey must consume actual L_A');
        requireThat(Array.isArray(results.lead.omitted) && results.lead.omitted.length === 0, 'Full Lead journey cannot certify omitted branches');
        const convertedProjectId = id(results.lead.convertedProjectId, 'actual UI conversion-returned Project');
        requireThat(typeof results.lead.convertedLocalSignDate === 'string' && typeof results.lead.convertedPlannedSignAt === 'string', 'Lead03 must return the actually exercised nonempty-date metadata');
        requireThat(!projects.some((project) => sameId(project, convertedProjectId)), 'Converted Project must not reuse a presigning fixture ID');
        completed.push(stage);

        stage = 'intelligence';
        const supplied = idOf(contexts.intelligence.ids.project);
        requireThat(supplied === undefined || sameId(supplied, convertedProjectId), 'An unrelated prepared Project cannot silently overwrite A real conversion output');
        const suppliedAlias = idOf(contexts.intelligence.ids.projectId);
        requireThat(suppliedAlias === undefined || sameId(suppliedAlias, convertedProjectId), 'A stale projectId alias must not conflict with the real conversion output');
        const ctx = contextFor('intelligence', { ids: { project: convertedProjectId } });
        results.intelligence = await functions.intelligenceDiscussionJourney(page, ctx);
        requireThat(results.intelligence?.status === 'completed-available-original-ui', 'IJK must complete its actual available UI');
        requireThat(sameId(results.intelligence.projectId, convertedProjectId) && sameId(results.intelligence.sourceLeadId, primaryLead), 'IJK workspace must consume actual A conversion/source L_A');
        requireThat(sameId(results.intelligence.leadId, registeredLead) && sameId(results.intelligence.customerId, leadCustomer), 'IJK registered Lead/Customer context must remain separate and correct');
        requireThat(results.intelligence.IUpdateOrDeleteUIAcceptance === false && results.intelligence.R4WriteAcceptance === false, 'Unavailable UI and future write boundaries must remain explicit');
        completed.push(stage);
        if (mode === 'rust-business') requireThat(observedKnownBusinessFailures.length === 0, 'Rust business cell observed a known incorrect business behavior');
        const result = { cellId, mode, actualBackend, browserPlatform, timezoneId, completed, results,
            NativeBusinessAcceptance: false,
            RustBusinessAcceptance: mode === 'rust-business',
            RustBusinessJourneyCompletions: mode === 'rust-business' ? 4 : 0,
            NativeReferenceJourneyCompletions: mode === 'native-known-defect-reference' ? 4 : 0,
            observedKnownBusinessFailures,
            projectBasicSixUIClaim: false, technicalCostWriteViaUIClaim: false,
            R4WriteAcceptance: false, G3Certified: false, G4Certified: false };
        await emit('completed', result);
        return result;
    } catch (error) {
        await emit('failed', { stage, completed, results, mode, actualBackend, browserPlatform,
            observedKnownBusinessFailures, message: error instanceof Error ? error.message : String(error), fallbackUsed: false });
        throw error;
    }
}
