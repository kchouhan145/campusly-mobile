import { API_BASE } from './config';

const toUrl = (path) => `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = isJson ? body?.message || 'Request failed' : body || 'Request failed';
    throw new Error(message);
  }

  return body;
}

export async function apiRequest(path, { method = 'GET', token, body, headers = {} } = {}) {
  const nextHeaders = {
    ...headers,
  };

  if (token) {
    nextHeaders.Authorization = `Bearer ${token}`;
  }

  let payload = body;
  if (body && !(body instanceof FormData)) {
    nextHeaders['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(toUrl(path), {
    method,
    headers: nextHeaders,
    body: payload,
  });

  return parseResponse(response);
}
