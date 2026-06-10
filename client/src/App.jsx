import { useState } from 'react';
import { useAuth } from './auth/AuthContext.jsx';
import { NotesProvider, useNotes } from './notes/NotesContext.jsx';
import { useDarkMode } from './theme/useDarkMode.js';
import AuthPage from './auth/AuthPage.jsx';
import TopBar from './components/TopBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Composer from './components/Composer.jsx';
import Masonry from './components/Masonry.jsx';
import NoteEditorModal from './components/NoteEditorModal.jsx';
import LabelEditor from './components/LabelEditor.jsx';

// Auth gate. While the initial /me check is in flight, show a spinner; logged
// out -> AuthPage; logged in -> the notes app (top bar, sidebar, grid, modal).

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
  const { notes, loading, view, query } = useNotes();
  const [openId, setOpenId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [labelsEditorOpen, setLabelsEditorOpen] = useState(false);
  const [dark, toggleDark] = useDarkMode();

  // Resolve the open note from live state so the modal sees item/color updates.
  const openNote = notes.find((n) => n.id === openId) || null;
  // The composer only makes sense on the main notes view (not archive/label/search).
  const showComposer = view.kind === 'active' && !query.trim();

  return (
    <div className="app">
      <TopBar
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
        dark={dark}
        onToggleDark={toggleDark}
      />
      <div className="app-body">
        <Sidebar open={sidebarOpen} onEditLabels={() => setLabelsEditorOpen(true)} />
        <main className="notes-area">
          {showComposer && <Composer />}
          {loading ? (
            <div className="app-loading">
              <div className="spinner" aria-label="Loading" />
            </div>
          ) : (
            <Masonry notes={notes} onOpen={(n) => setOpenId(n.id)} />
          )}
        </main>
      </div>
      {openNote && <NoteEditorModal note={openNote} onClose={() => setOpenId(null)} />}
      {labelsEditorOpen && <LabelEditor onClose={() => setLabelsEditorOpen(false)} />}
    </div>
  );
}
