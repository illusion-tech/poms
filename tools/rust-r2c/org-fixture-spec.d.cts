import type { FixtureOrgSlot } from './fixture-protocol.cjs';
export const orgFixtureSlots: readonly FixtureOrgSlot[];
export function orgFixtureSpec(runId: string, slot: FixtureOrgSlot): Readonly<{ name: string; code: string; databaseCode: string; description: string | null; displayOrder: number }>;
