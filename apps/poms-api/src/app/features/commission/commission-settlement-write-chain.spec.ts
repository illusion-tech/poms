import { evaluateRetentionDueDate } from './commission-settlement-write-chain';

describe('evaluateRetentionDueDate', () => {
    it('returns missing when the retention due date is absent', () => {
        expect(evaluateRetentionDueDate(null)).toEqual({
            retentionDueDate: null,
            retentionDueStatus: 'missing'
        });
    });

    it('treats the due date as reached when the business day has started in Asia/Hong_Kong', () => {
        expect(evaluateRetentionDueDate('2026-04-19', new Date('2026-04-18T16:30:00.000Z'))).toEqual({
            retentionDueDate: '2026-04-19',
            retentionDueStatus: 'due'
        });
    });

    it('keeps the due date pending before the business day starts in Asia/Hong_Kong', () => {
        expect(evaluateRetentionDueDate('2026-04-19', new Date('2026-04-18T15:59:59.000Z'))).toEqual({
            retentionDueDate: '2026-04-19',
            retentionDueStatus: 'pending'
        });
    });

    it('normalizes Date inputs with the business day instead of UTC slicing', () => {
        expect(evaluateRetentionDueDate(new Date('2026-04-18T16:00:00.000Z'), new Date('2026-04-18T16:30:00.000Z'))).toEqual({
            retentionDueDate: '2026-04-19',
            retentionDueStatus: 'due'
        });
    });
});
