import axios from 'axios';
import { E2E_API_BASE_URL } from './server-config';
import { E2E_HTTP_AGENT, E2E_HTTPS_AGENT } from './http-transport';

module.exports = async function () {
    axios.defaults.baseURL = E2E_API_BASE_URL;
    axios.defaults.validateStatus = () => true;
    axios.defaults.proxy = false;
    axios.defaults.timeout = 10_000;
    axios.defaults.maxRedirects = 0;
    axios.defaults.httpAgent = E2E_HTTP_AGENT;
    axios.defaults.httpsAgent = E2E_HTTPS_AGENT;
    axios.interceptors.response.use(undefined, () => Promise.reject(new Error('E2E API transport failed')));
};
