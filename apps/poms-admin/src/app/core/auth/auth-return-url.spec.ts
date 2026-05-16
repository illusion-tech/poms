import { sanitizeAuthReturnUrl } from './auth-return-url';

describe('sanitizeAuthReturnUrl', () => {
    it('keeps internal absolute app paths', () => {
        expect(sanitizeAuthReturnUrl('/customers?keyword=abc')).toBe('/customers?keyword=abc');
    });

    it('rejects external and protocol-relative URLs', () => {
        expect(sanitizeAuthReturnUrl('https://evil.example.com/customers')).toBe('/');
        expect(sanitizeAuthReturnUrl('//evil.example.com/customers')).toBe('/');
        expect(sanitizeAuthReturnUrl('customers')).toBe('/');
        expect(sanitizeAuthReturnUrl(null)).toBe('/');
    });
});
