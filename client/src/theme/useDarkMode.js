import { useState, useEffect } from 'react';

// Dark mode: reflected as data-theme on <html>, persisted in localStorage so it
// survives reloads. Pure client state — no network, fully offline.

const STORAGE_KEY = 'mykeep-theme';

function initialDark() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  return false; // default light; user toggle wins from then on
}

export function useDarkMode() {
  const [dark, setDark] = useState(initialDark);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  }, [dark]);

  return [dark, () => setDark((d) => !d)];
}
