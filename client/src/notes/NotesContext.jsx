import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';

// The notes data layer: holds the notes for the current *view* (active /
// archive / a label), the search query, the user's labels, and every mutation,
// so cards, the editor, and the sidebar can act without prop drilling. Updates
// are server-confirmed — we await the API and patch local state from the
// hydrated response, which keeps items/labels/attachments authoritative.

const NotesContext = createContext(null);

const ACTIVE_VIEW = { kind: 'active', labelId: null };

// Build the GET /api/notes query string for a view + search query.
function buildQuery(view, query) {
  const p = new URLSearchParams();
  p.set('archived', view.kind === 'archive' ? '1' : '0');
  if (view.kind === 'label' && view.labelId) p.set('label', String(view.labelId));
  if (query.trim()) p.set('q', query.trim());
  return p.toString();
}

// Would this note still belong in the current view after an edit?
function matchesView(note, view) {
  if (view.kind === 'archive') return !!note.archived;
  if (note.archived) return false; // active and label views show only non-archived
  if (view.kind === 'label') return note.labels.some((l) => l.id === view.labelId);
  return true;
}

// Match the server's ordering: pinned first, then higher position, then newer id.
function sortNotes(list) {
  return [...list].sort(
    (a, b) => b.pinned - a.pinned || b.position - a.position || b.id - a.id,
  );
}

export function NotesProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [notes, setNotes] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(ACTIVE_VIEW);
  const [query, setQuery] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setNotes(await apiGet(`/api/notes?${buildQuery(view, query)}`));
    } finally {
      setLoading(false);
    }
  }, [view, query]);

  const loadLabels = useCallback(async () => {
    setLabels(await apiGet('/api/labels'));
  }, []);

  // Refetch whenever the user, view, or query changes.
  useEffect(() => {
    if (userId) reload();
  }, [userId, reload]);

  useEffect(() => {
    if (userId) loadLabels();
  }, [userId, loadLabels]);

  const refreshNote = useCallback(async (id) => {
    const note = await apiGet(`/api/notes/${id}`);
    setNotes((prev) => prev.map((n) => (n.id === id ? note : n)));
    return note;
  }, []);

  async function createNote(payload) {
    const note = await apiPost('/api/notes', payload);
    setNotes((prev) => [note, ...prev]);
    return note;
  }

  async function updateNote(id, patch) {
    const note = await apiPatch(`/api/notes/${id}`, patch);
    // Keep the note only if it still belongs in the current view (e.g.
    // archiving in the active view, or unarchiving in the archive view, drops it).
    setNotes((prev) =>
      matchesView(note, view) ? prev.map((n) => (n.id === id ? note : n)) : prev.filter((n) => n.id !== id),
    );
    return note;
  }

  async function deleteNote(id) {
    await apiDelete(`/api/notes/${id}`);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function addItem(noteId, content) {
    await apiPost(`/api/notes/${noteId}/items`, { content });
    return refreshNote(noteId);
  }

  async function updateItem(noteId, itemId, patch) {
    await apiPatch(`/api/items/${itemId}`, patch);
    return refreshNote(noteId);
  }

  async function deleteItem(noteId, itemId) {
    await apiDelete(`/api/items/${itemId}`);
    return refreshNote(noteId);
  }

  // --- labels ---
  async function createLabel(name) {
    const label = await apiPost('/api/labels', { name });
    await loadLabels();
    return label;
  }

  async function renameLabel(id, name) {
    const label = await apiPatch(`/api/labels/${id}`, { name });
    await loadLabels();
    await reload(); // note chips reflect the new name
    return label;
  }

  async function deleteLabel(id) {
    await apiDelete(`/api/labels/${id}`);
    // If we're viewing the label being deleted, fall back to the active view.
    if (view.kind === 'label' && view.labelId === id) setView(ACTIVE_VIEW);
    await loadLabels();
    await reload();
  }

  async function assignLabel(noteId, labelId) {
    await apiPost(`/api/notes/${noteId}/labels`, { labelId });
    return refreshNote(noteId);
  }

  async function unassignLabel(noteId, labelId) {
    await apiDelete(`/api/notes/${noteId}/labels/${labelId}`);
    return refreshNote(noteId);
  }

  // Drag-reorder a group (pinned or others). Reuse the group's own position
  // values as a pool — sorted descending and reassigned to the new visual order
  // — so the global max stays stable and no global renumber is needed.
  async function reorderNotes(groupInNewOrder) {
    const pool = groupInNewOrder.map((n) => n.position).sort((a, b) => b - a);
    const positions = groupInNewOrder.map((n, i) => ({ id: n.id, position: pool[i] }));
    const posById = new Map(positions.map((p) => [p.id, p.position]));

    // Optimistic: apply the new positions locally and re-sort immediately.
    setNotes((prev) =>
      sortNotes(prev.map((n) => (posById.has(n.id) ? { ...n, position: posById.get(n.id) } : n))),
    );
    try {
      await apiPatch('/api/notes/reorder', { positions });
    } catch {
      reload(); // resync if the server rejected the reorder
    }
  }

  const value = {
    notes,
    labels,
    loading,
    view,
    query,
    setView,
    setQuery,
    reload,
    loadLabels,
    createNote,
    updateNote,
    deleteNote,
    addItem,
    updateItem,
    deleteItem,
    createLabel,
    renameLabel,
    deleteLabel,
    assignLabel,
    unassignLabel,
    reorderNotes,
  };
  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes must be used within a NotesProvider');
  return ctx;
}
