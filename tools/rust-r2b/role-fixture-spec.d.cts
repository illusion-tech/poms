import type {FixtureRoleSlot} from './fixture-protocol.cjs';
export const roleFixtureSlots: readonly FixtureRoleSlot[];
export function roleFixtureSpec(runId: string, slot: FixtureRoleSlot): Readonly<{roleKey: string; databaseKey: string; name: string; description: string | null; displayOrder: number}>;
