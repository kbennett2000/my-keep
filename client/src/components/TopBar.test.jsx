import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const auth = { user: { username: 'alice' }, logout: vi.fn() };
const notes = { setQuery: vi.fn() };
vi.mock('../auth/AuthContext.jsx', () => ({ useAuth: () => auth }));
vi.mock('../notes/NotesContext.jsx', () => ({ useNotes: () => notes }));

import TopBar from './TopBar.jsx';

const renderBar = (props = {}) =>
  render(<TopBar onToggleSidebar={() => {}} dark={false} onToggleDark={() => {}} {...props} />);

beforeEach(() => {
  auth.logout.mockClear();
  notes.setQuery.mockClear();
});

describe('TopBar', () => {
  test('typing in search pushes the query (debounced)', async () => {
    renderBar();
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'abc' } });
    await waitFor(() => expect(notes.setQuery).toHaveBeenCalledWith('abc'));
  });

  test('dark toggle calls onToggleDark', () => {
    const onToggleDark = vi.fn();
    renderBar({ onToggleDark });
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(onToggleDark).toHaveBeenCalled();
  });

  test('hamburger calls onToggleSidebar', () => {
    const onToggleSidebar = vi.fn();
    renderBar({ onToggleSidebar });
    fireEvent.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
    expect(onToggleSidebar).toHaveBeenCalled();
  });
});
