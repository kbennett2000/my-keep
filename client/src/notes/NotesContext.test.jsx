import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Stable fake user so the load effect runs once (see comment in the provider).
const FAKE_AUTH = { user: { id: 1, username: 'a' } };
vi.mock('../auth/AuthContext.jsx', () => ({ useAuth: () => FAKE_AUTH }));

import { NotesProvider, useNotes } from './NotesContext.jsx';

// Inspect the request URL to decide the response (URLs now carry query params).
function mockApi(impl) {
  globalThis.fetch = vi.fn(async (url, opts = {}) => {
    const r = impl(opts.method || 'GET', url, opts) || { status: 200, body: [] };
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
  const { notes, createNote, deleteNote, updateNote, setView, setQuery } = useNotes();
  return (
    <div>
      <div data-testid="titles">{notes.map((n) => n.title).join(',')}</div>
      <button onClick={() => createNote({ title: 'new' })}>create</button>
      <button onClick={() => deleteNote(1)}>del1</button>
      <button onClick={() => updateNote(1, { archived: false })}>unarchive1</button>
      <button onClick={() => setView({ kind: 'archive', labelId: null })}>archive-view</button>
      <button onClick={() => setView({ kind: 'label', labelId: 5 })}>label5-view</button>
      <button onClick={() => setQuery('milk')}>search-milk</button>
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

describe('NotesContext views & queries', () => {
  test('loads active notes (and labels) on mount', async () => {
    mockApi((m, url) => {
      if (url.startsWith('/api/labels')) return { status: 200, body: [] };
      if (url.includes('archived=0')) return { status: 200, body: [note({ title: 'one' })] };
      return { status: 200, body: [] };
    });
    renderApp();
    await waitFor(() => expect(screen.getByTestId('titles')).toHaveTextContent('one'));
  });

  test('switching to archive view refetches ?archived=1', async () => {
    mockApi((m, url) => {
      if (url.startsWith('/api/labels')) return { status: 200, body: [] };
      if (url.includes('archived=1')) return { status: 200, body: [note({ title: 'archived-note', archived: 1 })] };
      return { status: 200, body: [note({ title: 'active-note' })] };
    });
    renderApp();
    await waitFor(() => expect(screen.getByTestId('titles')).toHaveTextContent('active-note'));
    fireEvent.click(screen.getByText('archive-view'));
    await waitFor(() => expect(screen.getByTestId('titles')).toHaveTextContent('archived-note'));
  });

  test('label view refetches with ?label=', async () => {
    const seen = [];
    mockApi((m, url) => {
      if (url.startsWith('/api/notes')) seen.push(url);
      if (url.includes('label=5')) return { status: 200, body: [note({ title: 'labelled' })] };
      if (url.startsWith('/api/labels')) return { status: 200, body: [] };
      return { status: 200, body: [note({ title: 'plain' })] };
    });
    renderApp();
    await waitFor(() => expect(screen.getByTestId('titles')).toHaveTextContent('plain'));
    fireEvent.click(screen.getByText('label5-view'));
    await waitFor(() => expect(screen.getByTestId('titles')).toHaveTextContent('labelled'));
    expect(seen.some((u) => u.includes('label=5'))).toBe(true);
  });

  test('setting a query adds &q=', async () => {
    const seen = [];
    mockApi((m, url) => {
      if (url.startsWith('/api/notes')) seen.push(url);
      if (url.includes('q=milk')) return { status: 200, body: [note({ title: 'has milk' })] };
      if (url.startsWith('/api/labels')) return { status: 200, body: [] };
      return { status: 200, body: [note({ title: 'plain' })] };
    });
    renderApp();
    await waitFor(() => expect(screen.getByTestId('titles')).toHaveTextContent('plain'));
    fireEvent.click(screen.getByText('search-milk'));
    await waitFor(() => expect(seen.some((u) => u.includes('q=milk'))).toBe(true));
  });

  test('unarchiving in the archive view removes the note from the list', async () => {
    mockApi((m, url) => {
      if (url.startsWith('/api/labels')) return { status: 200, body: [] };
      if (m === 'PATCH') return { status: 200, body: note({ id: 1, archived: 0 }) };
      if (url.includes('archived=1')) return { status: 200, body: [note({ id: 1, title: 'arch', archived: 1 })] };
      return { status: 200, body: [] };
    });
    renderApp();
    fireEvent.click(screen.getByText('archive-view'));
    await waitFor(() => expect(screen.getByTestId('titles')).toHaveTextContent('arch'));
    fireEvent.click(screen.getByText('unarchive1'));
    await waitFor(() => expect(screen.getByTestId('titles')).toHaveTextContent(''));
  });

  test('create prepends and delete removes', async () => {
    mockApi((m, url) => {
      if (url.startsWith('/api/labels')) return { status: 200, body: [] };
      if (m === 'POST') return { status: 201, body: note({ id: 2, title: 'new' }) };
      if (m === 'DELETE') return { status: 200, body: { ok: true } };
      return { status: 200, body: [note({ id: 1, title: 'one' })] };
    });
    renderApp();
    await waitFor(() => expect(screen.getByTestId('titles')).toHaveTextContent('one'));
    fireEvent.click(screen.getByText('create'));
    await waitFor(() => expect(screen.getByTestId('titles')).toHaveTextContent('new,one'));
    fireEvent.click(screen.getByText('del1'));
    await waitFor(() => expect(screen.getByTestId('titles')).toHaveTextContent('new'));
  });
});
