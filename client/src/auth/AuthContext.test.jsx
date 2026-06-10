import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext.jsx';

// Route the global fetch by method+url to canned responses.
function routeFetch(routes) {
  globalThis.fetch = vi.fn(async (url, opts = {}) => {
    const key = `${opts.method || 'GET'} ${url}`;
    const r = routes[key];
    if (!r) throw new Error(`unrouted fetch: ${key}`);
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      statusText: 'x',
      text: async () => (r.body === undefined ? '' : JSON.stringify(r.body)),
    };
  });
}

function Consumer() {
  const { user, loading, login, logout } = useAuth();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <div data-testid="user">{user ? user.username : 'anon'}</div>
      <button onClick={() => login('bob', 'password123')}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

const renderApp = () =>
  render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>,
  );

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuthContext', () => {
  test('restores a session when /me returns a user', async () => {
    routeFetch({ 'GET /api/auth/me': { status: 200, body: { id: 1, username: 'alice' } } });
    renderApp();
    expect(await screen.findByTestId('user')).toHaveTextContent('alice');
  });

  test('starts logged out when /me is 401', async () => {
    routeFetch({ 'GET /api/auth/me': { status: 401, body: { error: 'unauthorized' } } });
    renderApp();
    expect(await screen.findByTestId('user')).toHaveTextContent('anon');
  });

  test('login sets the user; logout clears it', async () => {
    routeFetch({
      'GET /api/auth/me': { status: 401, body: { error: 'unauthorized' } },
      'POST /api/auth/login': { status: 200, body: { id: 2, username: 'bob' } },
      'POST /api/auth/logout': { status: 200, body: { ok: true } },
    });
    renderApp();
    await screen.findByTestId('user');

    fireEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('bob'));

    fireEvent.click(screen.getByText('logout'));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('anon'));
  });
});
