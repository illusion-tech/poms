-- READ ONLY. Bind the exact installed plan tag: $1 trigger name, $2 function name.
-- Expected: zero rows after the corresponding Root cleanup transaction commits.
SELECT t.tgname,t.tgrelid::regclass AS table_name,p.proname,n.nspname
FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE NOT t.tgisinternal AND n.nspname='poms'
  AND (t.tgname=$1::text OR p.proname=$2::text);

-- An orphan function is not necessarily attached to a trigger; check separately.
SELECT p.oid,p.proname,n.nspname
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='poms' AND p.proname=$1::text;

-- Bind $1 gate namespace, $2 gate key from this exact technical plan.
-- Expected: no held/waiting row after HTTP/transaction/controller completion.
SELECT l.pid,l.granted,a.state,a.wait_event_type,a.wait_event
FROM pg_locks l LEFT JOIN pg_stat_activity a ON a.pid=l.pid
WHERE l.locktype='advisory' AND l.classid=$1::oid AND l.objid=$2::oid AND l.objsubid=2;

-- Bind the actual observed request backend PIDs; no full query text or credentials.
SELECT pid,state,wait_event_type,wait_event,xact_start
FROM pg_stat_activity WHERE pid=ANY($1::integer[])
  AND (state='active' OR state LIKE 'idle in transaction%');
