import { useState } from 'react';
import { useAuth } from './auth/AuthContext.jsx';
import { NotesProvider, useNotes } from './notes/NotesContext.jsx';
import AuthPage from './auth/AuthPage.jsx';
import TopBar from './components/TopBar.jsx';
import Composer from './components/Composer.jsx';
import Masonry from './components/Masonry.jsx';
import NoteEditorModal from './components/NoteEditorModal.jsx';

// Auth gate. While the initial /me check is in flight, show a spinner; logged
// out -> AuthPage; logged in -> the notes app (composer + grid + editor modal).

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" aria-label="Loading" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <NotesProvider>
      <Shell />
    </NotesProvider>
  );
}

function Shell() {
  const { notes, loading } = useNotes();
  const [openId, setOpenId] = useState(null);
  // Resolve the open note from live state so the modal sees item/color updates.
  const openNote = notes.find((n) => n.id === openId) || null;

  return (
    <div className="app">
      <TopBar />
      <main className="notes-area">
        <Composer />
        {loading ? (
          <div className="app-loading">
            <div className="spinner" aria-label="Loading" />
          </div>
        ) : (
          <Masonry notes={notes} onOpen={(n) => setOpenId(n.id)} />
        )}
      </main>
      {openNote && <NoteEditorModal note={openNote} onClose={() => setOpenId(null)} />}
    </div>
  );
}
