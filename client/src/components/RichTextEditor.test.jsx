import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RichTextEditor from './RichTextEditor.jsx';

// Smoke test only. ProseMirror selection commands can't be driven meaningfully
// in jsdom, so the actual B/I/U/S formatting interaction is verified manually
// (like dnd-kit). Here we just confirm the editor mounts with its toolbar.

describe('RichTextEditor', () => {
  test('mounts and renders the B/I/U/S toolbar', async () => {
    render(<RichTextEditor value="<p>hi</p>" onChange={() => {}} />);
    expect(await screen.findByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Italic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Underline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Strikethrough' })).toBeInTheDocument();
  });
});
