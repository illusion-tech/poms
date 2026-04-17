/**
 * Shared Jest mock for @mikro-orm/core.
 *
 * Used via moduleNameMapper in jest.config.js so that every unit test
 * automatically gets this mock without needing an inline jest.mock() call.
 *
 * The chain covers all property-builder methods currently used across entity
 * files. Add new methods here when a new mikro-orm builder method is introduced.
 */

export const QueryOrder = { ASC: 'ASC', DESC: 'DESC' };

const CHAIN_METHODS = [
    'primary',
    'nullable',
    'length',
    'defaultRaw',
    'unique',
    'fieldName',
    'version',
    'default',
    'onCreate',
    'onUpdate',
    '$type',
    'precision',
    'scale',
    'comment',
    'columnType',
    'mapToPk',
    'foreignKeyName',
    'updateRule',
    'deleteRule',
] as const;

const makeChain = () => {
    const chain: Record<string, unknown> = {};
    CHAIN_METHODS.forEach((m) => {
        chain[m] = () => chain;
    });
    return chain;
};

export const defineEntity = Object.assign(
    (_config: unknown) => ({ class: class {}, setClass: () => undefined }),
    { properties: new Proxy({} as Record<string, unknown>, { get: () => makeChain }) }
);
