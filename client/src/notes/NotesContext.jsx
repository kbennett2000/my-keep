import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';

// The notes data layer: holds the active (non-archived) notes and every
// mutation, so cards and the editor modal can act without prop drilling.
// Updates are server-confirmed — we await the API and patch local state from
// the hydrated response, which keeps items/labels/attachments authoritative.

const NotesContext = createContext(null);

export function NotesProvider({ children }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setNotes(await apiGet('/api/notes'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Depend on the stable user id, not the object identity, so a new user object
  // with the same id doesn't re-trigger a load.
  const userId = user?.id;
  useEffect(() => {
    if (userId) reload();
  }, [userId, reload]);

  // Re-fetch a single note and replace it in place (used after item edits).
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
    // An archived note leaves the active list entirely.
    setNotes((prev) =>
      note.archived ? prev.filter((n) => n.id !== id) : prev.map((n) => (n.id === id ? note : n)),
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

  const value = {
    notes,
    loading,
    reload,
    createNote,
    updateNote,
    deleteNote,
    addItem,
    updateItem,
    deleteItem,
  };
  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes must be used within a NotesProvider');
  return ctx;
}
