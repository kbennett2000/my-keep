import { describe, test, expect, vi, afterEach } from 'vitest';
import { apiGet, apiPost, ApiError } from './api.js';

function mockFetch(status, body) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'x',
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('api wrapper', () => {
  test('returns parsed JSON on 2xx', async () => {
    mockFetch(200, { id: 1, username: 'alice' });
    const data = await apiGet('/api/auth/me');
    expect(data).toEqual({ id: 1, username: 'alice' });
  });

  test('sends credentials and JSON body on POST', async () => {
    mockFetch(201, { ok: true });
    await apiPost('/api/auth/login', { username: 'a', password: 'b' });
    const [, opts] = fetch.mock.calls[0];
    expect(opts.credentials).toBe('include');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opts.body)).toEqual({ username: 'a', password: 'b' });
  });

  test('throws ApiError with status + server message on non-2xx', async () => {
    mockFetch(409, { error: 'username already taken' });
    await expect(apiPost('/api/auth/register', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      message: 'username already taken',
    });
  });

  test('401 surfaces as ApiError status 401', async () => {
    mockFetch(401, { error: 'unauthorized' });
    await expect(apiGet('/api/auth/me')).rejects.toBeInstanceOf(ApiError);
  });

  test('empty body parses to null', async () => {
    mockFetch(200, undefined);
    expect(await apiGet('/api/health')).toBeNull();
  });
});
