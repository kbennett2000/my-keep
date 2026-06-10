import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageButton from './ImageButton.jsx';

describe('ImageButton', () => {
  test('selecting a file calls onSelect with the File', () => {
    const onSelect = vi.fn();
    render(<ImageButton onSelect={onSelect} />);
    const file = new File(['data'], 'pic.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Upload image'), { target: { files: [file] } });
    expect(onSelect).toHaveBeenCalledWith(file);
  });

  test('does nothing when no file is chosen', () => {
    const onSelect = vi.fn();
    render(<ImageButton onSelect={onSelect} />);
    fireEvent.change(screen.getByLabelText('Upload image'), { target: { files: [] } });
    expect(onSelect).not.toHaveBeenCalled();
  });
});
