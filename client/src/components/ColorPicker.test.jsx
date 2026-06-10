import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ColorPicker from './ColorPicker.jsx';

describe('ColorPicker', () => {
  test('selecting a swatch fires onSelect with the color name', () => {
    const onSelect = vi.fn();
    render(<ColorPicker value="default" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'teal' }));
    expect(onSelect).toHaveBeenCalledWith('teal');
  });

  test('marks the current color selected', () => {
    render(<ColorPicker value="red" onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: 'red' })).toHaveClass('selected');
  });
});
