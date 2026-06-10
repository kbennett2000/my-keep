import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Pretend a user is logged in so the provider loads on mount. The object must
// be STABLE across renders (like the real context's state) — a fresh literal
// each call would change `user` identity and re-trigger the load effect.
const FAKE_AUTH = { user: { id: 1, username: 'a' } };
vi.mock('../auth/AuthContext.jsx', () => ({ useAuth: () => FAKE_AUTH }));

import { NotesProvider, useNotes } from './NotesContext.jsx';

function routeFetch(routes) {
  globalThis.fetch = vi.fn(async (url, opts = {}) => {
    const r = routes[`${opts.method || 'GET'} ${url}`];
    if (!r) throw new Error(`unrouted: ${opts.method || 'GET'} ${url}`);
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      statusText: 'x',
      text: async () => (r.body === undefined ? '' : JSON.stringify(r.body)),
    };
  });
}

const note = (over) => ({ id: 1, title: 'one', pinned: 0, archived: 0, items: [], labels: [], attachments: [], ...over });

function Consumer() {
  const { notes, loading, createNote, updateNote, deleteNote } = useNotes();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <div data-testid="count">{notes.length}</div>
      <div data-testid="titles">{notes.map((n) => n.title).join(',')}</div>
      <button onClick={() => createNote({ title: 'new' })}>create</button>
      <button onClick={() => updateNote(1, { archived: true })}>archive1</button>
      <button onClick={() => deleteNote(1)}>del1</button>
    </div>
  );
}

const renderApp = () =>
  render(
    <NotesProvider>
      <Consumer />
    </NotesProvider>,
  );

afterEach(() => vi.restoreAllMocks());

describe('NotesContext', () => {
  test('loads notes on mount', async () => {
    routeFetch({ 'GET /api/notes': { status: 200, body: [note()] } });
    renderApp();
    expect(await screen.findByTestId('count')).toHaveTextContent('1');
  });

  test('create prepends the new note', async () => {
    routeFetch({
      'GET /api/notes': { status: 200, body: [note({ id: 1, title: 'one' })] },
      'POST /api/notes': { status: 201, body: note({ id: 2, title: 'new' }) },
    });
    renderApp();
    await screen.findByTestId('count');
    fireEvent.click(screen.getByText('create'));
    await waitFor(() => expect(screen.getByTestId('titles')).toHaveTextContent('new,one'));
  });

  test('archiving removes the note from the active list', async () => {
    routeFetch({
      'GET /api/notes': { status: 200, body: [note({ id: 1 })] },
      'PATCH /api/notes/1': { status: 200, body: note({ id: 1, archived: 1 }) },
    });
    renderApp();
    await screen.findByTestId('count');
    fireEvent.click(screen.getByText('archive1'));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
  });

  test('delete removes the note', async () => {
    routeFetch({
      'GET /api/notes': { status: 200, body: [note({ id: 1 })] },
      'DELETE /api/notes/1': { status: 200, body: { ok: true } },
    });
    renderApp();
    await screen.findByTestId('count');
    fireEvent.click(screen.getByText('del1'));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
  });
});
