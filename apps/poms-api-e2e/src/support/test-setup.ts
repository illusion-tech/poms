/* eslint-disable */
import axios from 'axios';
import { E2E_API_BASE_URL } from './server-config';

module.exports = async function () {
    axios.defaults.baseURL = E2E_API_BASE_URL;
    axios.defaults.validateStatus = () => true;
    axios.defaults.proxy = false;
};
