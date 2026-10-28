import axios from 'axios';
let input = '';
for await (const chunk of process.stdin) input += chunk;
const request = JSON.parse(input);
const normalize = (value) => JSON.parse(JSON.stringify(value, (_key, item) => (typeof item === 'number' && !Number.isFinite(item) ? { $number: String(item) } : item)));
try {
    const params = request.queryEncoding === 'url-search-params' ? new URLSearchParams(request.query) : Object.fromEntries(request.query);
    const response = await axios.request({ method: request.method, url: request.url, headers: Object.fromEntries(request.headers ?? []), params, data: request.json ?? undefined, timeout: request.timeoutMs });
    process.stdout.write(JSON.stringify({ success: true, response: { status: response.status, data: normalize(response.data) } }) + '\n');
} catch (error) {
    process.stdout.write(
        JSON.stringify({ success: false, isAxiosError: axios.isAxiosError(error), code: error.code ?? null, message: error.message, response: error.response ? { status: error.response.status, data: normalize(error.response.data) } : null }) + '\n'
    );
}
