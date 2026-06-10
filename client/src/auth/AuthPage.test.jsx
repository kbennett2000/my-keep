import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApiError } from '../api.js';

// Drive AuthPage in isolation with a stub auth context.
const auth = { login: vi.fn(), register: vi.fn() };
vi.mock('./AuthContext.jsx', () => ({ useAuth: () => auth }));

import AuthPage from './AuthPage.jsx';

function fillForm() {
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'bob' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
}

beforeEach(() => {
  auth.login.mockReset().mockResolvedValue(undefined);
  auth.register.mockReset().mockResolvedValue(undefined);
});

describe('AuthPage', () => {
  test('login mode submits via login()', async () => {
    render(<AuthPage />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith('bob', 'password123'));
    expect(auth.register).not.toHaveBeenCalled();
  });

  test('toggling to register submits via register()', async () => {
    render(<AuthPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' })); // the toggle link
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' })); // now the submit button
    await waitFor(() => expect(auth.register).toHaveBeenCalledWith('bob', 'password123'));
    expect(auth.login).not.toHaveBeenCalled();
  });

  test('a rejected login shows the server error message', async () => {
    auth.login.mockRejectedValue(new ApiError(401, 'invalid username or password'));
    render(<AuthPage />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid username or password');
  });
});
