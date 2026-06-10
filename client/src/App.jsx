import { useAuth } from './auth/AuthContext.jsx';
import AuthPage from './auth/AuthPage.jsx';
import TopBar from './components/TopBar.jsx';

// Auth gate. While the initial /me check is in flight, show a spinner; logged
// out -> AuthPage; logged in -> the app shell (just a placeholder for now; the
// notes UI lands in Slice 6).

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
    <div className="app">
      <TopBar />
      <main className="notes-area">
        <p className="empty-state">No notes yet — the notes UI arrives in the next update.</p>
      </main>
    </div>
  );
}
