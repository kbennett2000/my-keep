import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AttachmentGrid from './AttachmentGrid.jsx';

const attachments = [
  { id: 1, mime: 'image/png', url: '/api/attachments/1' },
  { id: 2, mime: 'image/jpeg', url: '/api/attachments/2' },
];

describe('AttachmentGrid', () => {
  test('renders one image per attachment with the right src', () => {
    render(<AttachmentGrid attachments={attachments} />);
    const imgs = screen.getAllByRole('img');
    expect(imgs).toHaveLength(2);
    expect(imgs[0]).toHaveAttribute('src', '/api/attachments/1');
  });

  test('renders nothing when there are no attachments', () => {
    const { container } = render(<AttachmentGrid attachments={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('with onDelete, delete buttons call it; without, none render', () => {
    const onDelete = vi.fn();
    const { rerender } = render(<AttachmentGrid attachments={attachments} onDelete={onDelete} />);
    const buttons = screen.getAllByRole('button', { name: 'Delete image' });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    expect(onDelete).toHaveBeenCalledWith(attachments[0]);

    rerender(<AttachmentGrid attachments={attachments} />);
    expect(screen.queryByRole('button', { name: 'Delete image' })).toBeNull();
  });
});
