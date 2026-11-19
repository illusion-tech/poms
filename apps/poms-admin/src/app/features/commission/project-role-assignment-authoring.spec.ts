import { roleWeightUnits } from './project-role-assignment-authoring';

describe('roleWeightUnits', () => {
    it('checks the original decimal before producing a numeric wire value', () => {
        expect(roleWeightUnits('1e-6')).toBe(1);
        expect(roleWeightUnits('0.1000000')).toBe(100000);
        expect(roleWeightUnits('1')).toBe(1000000);
        expect(roleWeightUnits('0')).toBe(0);
        for (const invalid of ['1e-7', '0.10000000000000001', '-1', 'NaN', '1.000001', 'Infinity']) {
            expect(() => roleWeightUnits(invalid)).toThrow();
        }
    });
});
