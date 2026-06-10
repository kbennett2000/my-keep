import { useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { ApiError } from '../api.js';

// One screen, two modes. Toggling between Login and Register swaps which auth
// action runs on submit; errors from the server (bad password, taken username)
// render inline.

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isRegister) await register(username, password);
      else await login(username, password);
      // On success the AuthProvider sets the user and App swaps away from here.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function toggleMode() {
    setMode(isRegister ? 'login' : 'register');
    setError('');
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1 className="auth-title">MyKeep</h1>
        <p className="auth-subtitle">{isRegister ? 'Create your account' : 'Welcome back'}</p>

        <label className="auth-field">
          <span>Username</span>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={isRegister ? 8 : undefined}
          />
        </label>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button className="auth-submit" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : isRegister ? 'Sign up' : 'Log in'}
        </button>

        <p className="auth-switch">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" className="auth-link" onClick={toggleMode}>
            {isRegister ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </form>
    </div>
  );
}
