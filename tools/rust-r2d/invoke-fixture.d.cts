import type { FixtureRequest, FixtureResponse } from './fixture-protocol.cjs';
export function invokeFixture(request: FixtureRequest): Promise<FixtureResponse>;
