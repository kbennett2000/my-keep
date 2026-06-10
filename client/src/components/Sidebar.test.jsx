import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const notes = {
  view: { kind: 'active', labelId: null },
  setView: vi.fn(),
  labels: [{ id: 5, name: 'work' }],
};
vi.mock('../notes/NotesContext.jsx', () => ({ useNotes: () => notes }));

import Sidebar from './Sidebar.jsx';

beforeEach(() => notes.setView.mockClear());

describe('Sidebar', () => {
  test('renders Notes, Archive, and the user labels', () => {
    render(<Sidebar open />);
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
    expect(screen.getByText('work')).toBeInTheDocument();
  });

  test('clicking a label sets the label view', () => {
    render(<Sidebar open />);
    fireEvent.click(screen.getByText('work'));
    expect(notes.setView).toHaveBeenCalledWith({ kind: 'label', labelId: 5 });
  });

  test('clicking Archive sets the archive view', () => {
    render(<Sidebar open />);
    fireEvent.click(screen.getByText('Archive'));
    expect(notes.setView).toHaveBeenCalledWith({ kind: 'archive', labelId: null });
  });
});
