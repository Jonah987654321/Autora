import axios, { type InternalAxiosRequestConfig } from 'axios'

// --- Base client
// No interceptors => no automatic refresh
// used for all auth-related queries
const client = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// --- Refresh client
// Interceptor that is automatically refreshing the api access token
// Used for most queries that are tied to logged-in user
const refreshClient = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Custom interface to manage a retry flag
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retried?: boolean;
}

export {client, refreshClient, type CustomAxiosRequestConfig}