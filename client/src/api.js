// The one place the frontend talks to the backend. Every call sends cookies
// (credentials: 'include') so the session rides along, and non-2xx responses
// become an ApiError the caller can branch on (e.g. 401 -> logged out, 409 ->
// duplicate).

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(method, path, body) {
  const opts = { method, credentials: 'include', headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  return parse(await fetch(path, opts));
}

async function parse(res) {
  // 204 / empty bodies parse to null rather than throwing.
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, (data && data.error) || res.statusText);
  }
  return data;
}

export const apiGet = (path) => request('GET', path);
export const apiPost = (path, body) => request('POST', path, body);
export const apiPatch = (path, body) => request('PATCH', path, body);
export const apiDelete = (path) => request('DELETE', path);

// Multipart upload (images). FormData sets its own Content-Type boundary, so we
// don't set headers here.
export async function apiUpload(path, formData) {
  return parse(await fetch(path, { method: 'POST', credentials: 'include', body: formData }));
}
