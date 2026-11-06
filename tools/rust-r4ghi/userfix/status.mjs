import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sha } from './pure.mjs';

// TypeScript Swagger says 200 for these creates; actual Nest default and the
// frozen Rust HTTP adapters explicitly use CREATED. Do not widen to [200,201].
export function statusBindings(ctx) {
  const inputs = [
    'apps/poms-api-rust/src/http.rs',
    'apps/poms-api-rust/src/roles/http.rs',
    'apps/poms-api-rust/src/org_units/http.rs',
    'apps/poms-api/src/app/features/platform/platform.controller.ts',
  ].map(file => { const bytes = fs.readFileSync(`${ctx.win}/${file}`); return { file, sha256: sha(bytes), source: bytes.toString('utf8') }; });
  assert(/users::http::router\([\s\S]{0,200}StatusCode::CREATED/.test(inputs[0].source));
  for (const input of inputs.slice(1, 3)) assert(input.source.includes('(StatusCode::CREATED, Json(value))'));
  const pins = inputs.map(({ file, sha256 }) => ({ file, sha256 }));
  if (ctx.state.statusSourcePins) assert.deepEqual(ctx.state.statusSourcePins, pins, 'Actual create-status sources changed');
  else { ctx.state.statusSourcePins = pins; ctx.persist(); }
  return {
    PlatformController_createUser: { status: 201, specDeclaration: 200, source: pins[0] },
    PlatformController_createRole: { status: 201, specDeclaration: 200, source: pins[1] },
    PlatformController_createOrgUnit: { status: 201, specDeclaration: 200, source: pins[2] },
  };
}
