import { useState, useEffect, useRef } from 'react';
import { Menu, Search, X, Sun, Moon } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useNotes } from '../notes/NotesContext.jsx';

// App bar: sidebar toggle, brand, debounced search, dark-mode toggle, user +
// logout. Search keeps its own input state and pushes to the notes query after
// a short debounce so we don't refetch on every keystroke.

export default function TopBar({ onToggleSidebar, dark, onToggleDark }) {
  const { user, logout } = useAuth();
  const { setQuery } = useNotes();
  const [text, setText] = useState('');
  const timer = useRef(null);

  useEffect(() => {
    timer.current = setTimeout(() => setQuery(text), 250);
    return () => clearTimeout(timer.current);
  }, [text, setQuery]);

  function clearSearch() {
    setText('');
    setQuery('');
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn" aria-label="Toggle sidebar" onClick={onToggleSidebar}>
          <Menu size={20} />
        </button>
        <div className="topbar-brand">MyKeep</div>
      </div>

      <div className="topbar-search">
        <Search size={18} className="search-icon" />
        <input
          type="search"
          placeholder="Search"
          aria-label="Search"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {text && (
          <button className="icon-btn" aria-label="Clear search" onClick={clearSearch}>
            <X size={16} />
          </button>
        )}
      </div>

      <div className="topbar-right">
        <button
          className="icon-btn"
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={onToggleDark}
        >
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <span className="topbar-user">{user?.username}</span>
        <button className="topbar-logout" onClick={() => logout()}>
          Log out
        </button>
      </div>
    </header>
  );
}
