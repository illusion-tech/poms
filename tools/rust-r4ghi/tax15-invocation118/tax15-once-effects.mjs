// Bounded Source15 Tax effect successor. Root exact G2 is mandatory; module
// import executes no context, SQL, HTTP, process or state write.
import fs from "node:fs";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { keyOf, quote, sha, uuid } from "../business/pure.mjs";
import {
    F118,
    json118,
    pin118,
    read118,
    samePin118,
    sha118,
} from "./retained-tax-proof.mjs";
import {
    advanceFamily118,
    beginFamily118,
    checkpoint118,
    invocationJournal118,
    runtime118,
    setVerifiedPrefix118,
    stage118,
} from "./invocation-proof.mjs";
import { createWire118 } from "./tax15-once-wire.mjs";
const hash = (value) => sha118(JSON.stringify(value)), identitySHA = hash;
export function permissionSet118(values, userId) {
    const ids = new Set(
            values.user_role_assignment.filter((a) =>
                a.status === "active" && a.user_id === userId
            ).map((a) => a.role_id),
        ),
        active = new Set(
            values.role.filter((r) => r.is_active && ids.has(r.id)).map((r) =>
                r.id
            ),
        );
    return [
        ...new Set(
            values.role_permission_assignment.filter((a) =>
                a.status === "active" && active.has(a.role_id)
            ).map((a) => a.permission_key),
        ),
    ].sort();
}
export function assertSessionFacts118(
    {
        actorId,
        account,
        permissions,
        expectedPermissions,
        session,
        cookieHash,
        now,
        ownedSession,
    },
) {
    assert(
        account && account.id === actorId && account.is_active,
        "Actual active actor required",
    );
    assert(
        Array.isArray(expectedPermissions) && expectedPermissions.length > 0,
    );
    assert.deepEqual(
        [...permissions].sort(),
        [...expectedPermissions].sort(),
        "Actual permissions changed",
    );
    if (cookieHash) {
        assert(
            session && session.user_id === actorId &&
                session.token_hash === cookieHash &&
                session.status === "active",
            "Actual cookie/session actor mismatch",
        );
        assert(ownedSession, "Actual session must be owned");
        assert(
            Date.parse(session.idle_expires_at) - now > 2000 &&
                Date.parse(session.absolute_expires_at) - now > 2000,
            "Real session expired or too close to deadline",
        );
    }
    return session?.id ?? null;
}
export async function guardActor118(cap) {
    const { ctx, p } = runtime118(cap), actor = ctx.state.actors[p.actorKey];
    assert.equal(actor.id, p.actorId);
    const cookieHash = p.mode !== "disarm-owned" && actor.cookies?.poms_session
        ? sha(decodeURIComponent(actor.cookies.poms_session))
        : null;
    return ctx.db(async (c) => {
        const account = (await c.query(
            "SELECT to_jsonb(u) value FROM poms.platform_user u WHERE id=$1",
            [p.actorId],
        )).rows;
        assert.equal(account.length, 1);
        const assigned = (await c.query(
                "SELECT user_id::text,role_id::text,status FROM poms.user_role_assignment WHERE user_id=$1 AND status='active'",
                [p.actorId],
            )).rows,
            roles = (await c.query(
                "SELECT id::text,is_active FROM poms.role WHERE id=ANY($1::uuid[])",
                [assigned.map((r) => r.role_id)],
            )).rows,
            perms = (await c.query(
                "SELECT role_id::text,permission_key,status FROM poms.role_permission_assignment WHERE role_id=ANY($1::uuid[]) AND status='active'",
                [roles.filter((r) => r.is_active).map((r) => r.id)],
            )).rows,
            session = cookieHash
                ? (await c.query(
                    "SELECT to_jsonb(s)||jsonb_build_object('observed_now',clock_timestamp()) value FROM poms.auth_session s WHERE token_hash=$1",
                    [cookieHash],
                )).rows
                : [];
        if (cookieHash) assert.equal(session.length, 1);
        const s = session[0]?.value,
            now = s ? Date.parse(s.observed_now) : Date.now();
        return assertSessionFacts118({
            actorId: p.actorId,
            account: account[0].value,
            permissions: permissionSet118({
                user_role_assignment: assigned,
                role: roles,
                role_permission_assignment: perms,
            }, p.actorId),
            expectedPermissions: p.expectedActorPermissions,
            session: s,
            cookieHash,
            now,
            ownedSession: s &&
                Boolean(
                    ctx.state
                        .owned[keyOf(ctx.database, "auth_session", [s.id])],
                ),
        });
    });
}
export function assertCurrentScope118(cap, before) {
    const { ctx, p, h, prepared, legacy } = runtime118(cap);
    h.assertEffectsReadyTax15(prepared);
    const body = prepared.body;
    assert.equal(hash(body), p.bodySHA256);
    const scope = ctx.state.taxContinuation121.sweep?.scope ??
        {
            operationId: F118.operation,
            branch: "tax",
            projectId: body.projectId,
            actorId: p.actorId,
            actorKey: p.actorKey,
            params: {},
            body,
        };
    assert.equal(scope.actorId, p.actorId);
    assert.deepEqual(scope.body, body);
    const facts = h.deriveTax13Facts(
        ctx,
        before,
        body,
        legacy,
        prepared.packets,
        h.readRows,
    );
    assert.deepEqual(
        facts,
        prepared.facts,
        "Every actual current target/source must equal the frozen complete preparation",
    );
    const inventory = h.inventoryTax13(facts);
    assert.deepEqual(inventory, prepared.inventory);
    if (scope.sharedFacts) assert.deepEqual(scope.sharedFacts, facts);
    return { ...scope, sharedFacts: facts };
}
export async function waitAuth118(cap) {
    const { ctx, p, h } = runtime118(cap),
        settings = h.loadActualAuthConfig(ctx),
        actor = ctx.state.actors[p.actorKey];
    assert(settings.throttleSeconds + 2 < settings.idleSeconds);
    const token = sha(decodeURIComponent(actor.cookies.poms_session));
    for (let waits = 0;; waits++) {
        checkpoint118(cap, "auth-due-before");
        await guardActor118(cap);
        const rows = await ctx.db(async (c) =>
            (await c.query(
                "SELECT id::text,user_id::text,status,last_seen_at,clock_timestamp() now,idle_expires_at,absolute_expires_at FROM poms.auth_session WHERE token_hash=$1",
                [token],
            )).rows
        );
        assert.equal(rows.length, 1);
        const row = rows[0];
        assert.equal(row.user_id, p.actorId);
        assert.equal(row.status, "active");
        assert(
            ctx.state
                .owned[keyOf(ctx.database, "auth_session", [uuid(row.id)])],
        );
        const now = Date.parse(row.now),
            deadline = Math.min(
                Date.parse(row.idle_expires_at),
                Date.parse(row.absolute_expires_at),
            ),
            remaining = Date.parse(row.last_seen_at) +
                settings.throttleSeconds * 1000 + 100 - now;
        assert(deadline - now > 2000);
        if (remaining <= 0) {
            return ctx.artifact(ctx.next("tax118-auth-due") + ".json", {
                sessionId: row.id,
                observedAt: row.now,
                lastSeen: row.last_seen_at,
                waits,
                SQLBackdating: false,
            });
        }
        assert(remaining + 2000 < deadline - now);
        await delay(Math.min(5000, Math.ceil(remaining)));
    }
}
export function rememberAck118(cap, attempt, receipt, before) {
    const { ctx, p } = runtime118(cap), record = ctx.state.taxContinuation121;
    assert.equal(p.mode, "commit-once");
    assert(record.normalTaxPending);
    assert(
        !record.sweep.finalSuccess,
        "A real successful ACK is never overwritten",
    );
    assert.equal(attempt.operationId, F118.operation);
    assert.equal(attempt.status, 201);
    assert.equal(attempt.responseComplete, true);
    assert.equal(attempt.transportFailure, false);
    assert.equal(attempt.requestBodySha256, p.bodySHA256);
    record.sweep.finalSuccess = {
        status: 201,
        requestId: attempt.requestId,
        operationId: attempt.operationId,
        receipt,
        receiptId: receipt,
        responseComplete: true,
        transportFailure: false,
        body: attempt.body,
        requestBodySha256: attempt.requestBodySha256,
        before,
        postconditions: "pending-after-capture-ledger",
    };
    ctx.persist();
}
export async function install118(cap, descriptor, requestId, before) {
    const { ctx, p, h, manifest, prepared, frame } = runtime118(cap);
    assert(frame && frame.key === descriptor.key);
    assert(!ctx.state.activeFault);
    assert.equal(descriptor.kind, F118.faultKind);
    assert(/^[A-Za-z0-9_-]{1,100}$/.test(requestId));
    const scope = descriptor.scope;
    assert.deepEqual(assertCurrentScope118(cap, before), scope);
    const inventory = h.inventoryTax13(scope.sharedFacts),
        selected = inventory.find((d) => d.key === descriptor.key);
    assert(selected);
    assert.deepEqual(selected, descriptor.selected);
    const sessionId = h.requireOwnedScope(ctx, before, scope),
        binding = { requestId, sessionId },
        suffix = ctx.next("tax14-fi").replaceAll("-", "_"),
        primary = controlNames(
            ctx,
            selected.table,
            selected.event,
            suffix + "_p",
            selected.deferred === true,
        ),
        fallback = controlNames(
            ctx,
            "operating_command_receipt",
            "INSERT",
            suffix + "_f",
            true,
        ),
        receipt = inventory.find((d) => d.key === "SHARED-GH-command-receipt");
    assert(receipt);
    const active = {
        kind: F118.faultKind,
        phase: "install-intent",
        requestId,
        operationId: F118.operation,
        key: selected.key,
        scope,
        selected,
        sessionId,
        before: before.manifest,
        primary,
        fallback,
        sourcePinsSHA256: manifest.current.sourcePinsSHA256,
        bindingSHA256: hash(manifest),
        runtimeBindings: p.runtimeBindings,
        codeAdmission15: manifest.current.codeAdmission15,
        apiProcess: manifest.current.apiProcess,
        runtimeAdmission121:manifest.current.runtimeAdmission121,
        invocation118: {
            nonce: p.nonce,
            input: runtime118(cap).inputPin,
            cursor: frame.cursor,
            executionSources: p.executionSources,
        },
    };
    active.intent = ctx.artifact(
        ctx.next("tax118-fi-intent") + ".json",
        active,
        {
            kind: "exact-Source15-owned-required-FI-intent",
            writeFamily: selected.key,
            businessFixtureSQL: false,
        },
    );
    ctx.state.activeFault = active;
    ctx.persist();
    checkpoint118(cap, "DDL-install-before");
    await guardActor118(cap);
    await ctx.db(async (c) => {
        await c.query("BEGIN");
        try {
            await createControl(
                c,
                ctx,
                primary,
                h.efSelectorSql40(selected, binding),
                "primary",
            );
            await createControl(
                c,
                ctx,
                fallback,
                h.efSelectorSql40(receipt, binding),
                "fallback",
            );
            active.primary.identity = await inspect(c, primary);
            active.primary.identitySHA = identitySHA(active.primary.identity);
            active.fallback.identity = await inspect(c, fallback);
            active.fallback.identitySHA = identitySHA(active.fallback.identity);
            active.phase = "commit-pending";
            ctx.persist();
            await c.query("COMMIT");
        } catch (error) {
            await c.query("ROLLBACK");
            throw error;
        }
    });
    active.phase = "installed";
    ctx.persist();
    checkpoint118(cap, "DDL-install-after");
    await guardActor118(cap);
    stage118(cap, {
        cursor: frame.cursor,
        key: frame.key,
        bodySHA256: p.bodySHA256,
        stage: "controlsInstalled",
        sessionId,
        controlIdentity: {
            primary: active.primary.identitySHA,
            fallback: active.fallback.identitySHA,
        },
    });
    ctx.artifact(ctx.next("tax118-fi-installed") + ".json", active, {
        kind: "actual-Source15-owned-required-FI-installed",
        writeFamily: selected.key,
        businessFixtureSQL: false,
    });
    return active;
}
export async function remove118(cap) {
    const { ctx, p, manifest, frame } = runtime118(cap),
        active = ctx.state.activeFault;
    assert.equal(active?.kind, F118.faultKind);
    if (p.mode === "disarm-owned") {
        pin118(p.expectedActiveFault);
        assert.deepEqual(json118(p.expectedActiveFault), active);
    } else {
        assert.equal(active.invocation118?.nonce, p.nonce);
        assert.equal(active.invocation118?.cursor, frame.cursor);
    }
    samePin118(active.runtimeAdmission121,manifest.current.runtimeAdmission121);
    samePin118(active.codeAdmission15, manifest.current.codeAdmission15);
    assert(
        ["installed", "commit-pending"].includes(active.phase) &&
            active.primary.identitySHA && active.fallback.identitySHA,
        "Interrupted install requires Root catalog reconciliation",
    );
    checkpoint118(cap, "DDL-remove-before");
    await guardActor118(cap);
    const counts = await ctx.db(async (c) => {
        await c.query("BEGIN");
        try {
            for (const control of [active.primary, active.fallback]) {
                assert.equal(
                    identitySHA(await inspect(c, control)),
                    control.identitySHA,
                    "Exact OID/definition/owner/ACL changed",
                );
            }
            const result = {};
            for (
                const [name, control] of [["primary", active.primary], [
                    "fallback",
                    active.fallback,
                ]]
            ) {
                const hit = (await c.query(
                    `SELECT last_value::text,is_called FROM r4ghi_control.${
                        quote(control.sequence)
                    }`,
                )).rows[0];
                result[name] = hit.is_called ? Number(hit.last_value) : 0;
                assert(Number.isSafeInteger(result[name]));
                await c.query(
                    `DROP TRIGGER ${quote(control.trigger)} ON poms.${
                        quote(control.table)
                    }`,
                );
                await c.query(
                    `DROP FUNCTION r4ghi_control.${quote(control.function)}()`,
                );
                await c.query(
                    `DROP SEQUENCE r4ghi_control.${quote(control.sequence)}`,
                );
            }
            await c.query("COMMIT");
            return result;
        } catch (error) {
            await c.query("ROLLBACK");
            throw error;
        }
    });
    const receipt = ctx.artifact(ctx.next("sweep-disarmed") + ".json", {
        active,
        counts,
        identityMatched: true,
    }, {
        kind: "actual-Source15-Tax-required-FI-disarmed",
        operationId: active.operationId,
        writeFamily: active.key,
        primaryHits: counts.primary,
        fallbackHits: counts.fallback,
        exactOwnedControlsOnly: true,
    });
    delete ctx.state.activeFault;
    ctx.persist();
    checkpoint118(cap, "DDL-remove-after");
    await guardActor118(cap);
    if (frame) {
        stage118(cap, {
            cursor: frame.cursor,
            key: frame.key,
            bodySHA256: p.bodySHA256,
            stage: "controlsRemoved",
        });
    }
    return {
        ...active,
        hitCount: counts.primary,
        fallbackHitCount: counts.fallback,
        sessionId: active.sessionId,
        key: active.key,
        receipt,
    };
}

// ORIGINAL_CONTROL_TEMPLATE118 is appended byte-for-byte from sealed A258.
function controlNames(ctx, table, event, suffix, deferred = false) {
    const prefix = `${ctx.state.prefix}_${suffix}`;
    const control = {
        table,
        event,
        deferred,
        function: `${prefix}_fn`,
        trigger: `${prefix}_tg`,
        sequence: `${prefix}_hits`,
    };
    for (const name of [control.function, control.trigger, control.sequence]) {
        quote(name);
        assert(name.length <= 63);
    }
    return control;
}
async function inspect(c, control) {
    const fn = (await c.query(
        "SELECT p.oid::text oid,pg_get_functiondef(p.oid) definition,p.proacl::text acl,pg_get_userbyid(p.proowner) owner,p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='r4ghi_control' AND p.proname=$1",
        [control.function],
    )).rows;
    const trigger = (await c.query(
        "SELECT oid::text,pg_get_triggerdef(oid,true) definition,tgenabled FROM pg_trigger WHERE tgname=$1 AND tgrelid=$2::regclass",
        [control.trigger, `poms.${control.table}`],
    )).rows;
    const sequence = (await c.query(
        "SELECT c.oid::text,pg_get_userbyid(c.relowner) owner,c.relacl::text acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='r4ghi_control' AND c.relname=$1 AND c.relkind='S'",
        [control.sequence],
    )).rows;
    assert.equal(fn.length, 1);
    assert.equal(trigger.length, 1);
    assert.equal(sequence.length, 1);
    return { fn, trigger, sequence };
}
async function createControl(c, ctx, control, selector, marker) {
    assert(/^[a-z0-9-]+$/.test(marker));
    await c.query(
        `CREATE SEQUENCE r4ghi_control.${
            quote(control.sequence)
        } START 1 MINVALUE 1 NO CYCLE`,
    );
    await c.query(
        `CREATE FUNCTION r4ghi_control.${
            quote(control.function)
        }() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $r4ghi_sweep40$
DECLARE j jsonb:=to_jsonb(NEW);
BEGIN
 IF current_user<>'${ctx.owner}' THEN RAISE EXCEPTION 'Unexpected FI definer'; END IF;
 IF ${selector} THEN
  PERFORM nextval('r4ghi_control.${control.sequence}'::regclass);
  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='r4ghi-required-write-${marker}';
 END IF;
 RETURN NEW;
END; $r4ghi_sweep40$`,
    );
    await c.query(
        `REVOKE ALL ON FUNCTION r4ghi_control.${
            quote(control.function)
        }() FROM PUBLIC`,
    );
    await c.query(
        `GRANT EXECUTE ON FUNCTION r4ghi_control.${
            quote(control.function)
        }() TO ${quote(ctx.apps[1])}`,
    );
    const timing = control.deferred
        ? "CREATE CONSTRAINT TRIGGER"
        : "CREATE TRIGGER";
    const phase = control.deferred ? "AFTER" : "BEFORE";
    const deferral = control.deferred ? " DEFERRABLE INITIALLY DEFERRED" : "";
    await c.query(
        `${timing} ${
            quote(control.trigger)
        } ${phase} ${control.event} ON poms.${
            quote(control.table)
        }${deferral} FOR EACH ROW EXECUTE FUNCTION r4ghi_control.${
            quote(control.function)
        }()`,
    );
}
