import assert from 'node:assert/strict';
export function fixtureCredentials(runId,account){assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(runId));assert(['admin','viewer'].includes(account));return Object.freeze({username:'r2m_'+account+'_'+runId.replaceAll('-',''),password:'R2M_'+runId+'_synthetic_only'});}
