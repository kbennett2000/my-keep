import { describe, test, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDarkMode } from './useDarkMode.js';

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('useDarkMode', () => {
  test('defaults to light and applies data-theme', () => {
    const { result } = renderHook(() => useDarkMode());
    expect(result.current[0]).toBe(false);
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('mykeep-theme')).toBe('light');
  });

  test('toggling switches to dark and persists', () => {
    const { result } = renderHook(() => useDarkMode());
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('mykeep-theme')).toBe('dark');
  });

  test('reads a stored preference on init', () => {
    localStorage.setItem('mykeep-theme', 'dark');
    const { result } = renderHook(() => useDarkMode());
    expect(result.current[0]).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
