import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from './ConfirmDialog.jsx';

let onConfirm;
let onCancel;

beforeEach(() => {
  onConfirm = vi.fn();
  onCancel = vi.fn();
});

function renderDialog() {
  render(<ConfirmDialog message="Delete this note?" onConfirm={onConfirm} onCancel={onCancel} />);
}

describe('ConfirmDialog', () => {
  test('renders the message and both buttons', () => {
    renderDialog();
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Delete this note?');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  test('Delete calls onConfirm (not onCancel)', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  test('Cancel calls onCancel', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('Escape calls onCancel', () => {
    renderDialog();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('custom labels render', () => {
    render(
      <ConfirmDialog
        message="Sure?"
        confirmLabel="Remove"
        cancelLabel="Keep"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
  });
});
