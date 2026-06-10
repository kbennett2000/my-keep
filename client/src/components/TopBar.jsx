import { useAuth } from '../auth/AuthContext.jsx';

// Minimal app bar for the scaffold: brand, current user, logout. Search / view
// toggle / dark mode arrive in Slice 7.

export default function TopBar() {
  const { user, logout } = useAuth();
  return (
    <header className="topbar">
      <div className="topbar-brand">MyKeep</div>
      <div className="topbar-right">
        <span className="topbar-user">{user?.username}</span>
        <button className="topbar-logout" onClick={() => logout()}>
          Log out
        </button>
      </div>
    </header>
  );
}
