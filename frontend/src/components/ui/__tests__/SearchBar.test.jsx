import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('SearchBar Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders input with default properties correctly', () => {
    render(<SearchBar placeholder="Find decor..." />);
    const inputEl = screen.getByLabelText('Search');
    expect(inputEl).toBeInTheDocument();
    expect(inputEl).toHaveAttribute('placeholder', 'Find decor...');
    expect(inputEl.value).toBe('');
  });

  it('initializes with a starting value prop correctly', () => {
    render(<SearchBar value="brass deepam" onChange={() => {}} />);
    const inputEl = screen.getByLabelText('Search');
    expect(inputEl.value).toBe('brass deepam');
  });

  it('does not trigger onChange immediately on character inputs (debounced)', () => {
    const handleChange = vi.fn();
    render(<SearchBar value="" onChange={handleChange} />);
    const inputEl = screen.getByLabelText('Search');

    fireEvent.change(inputEl, { target: { value: 'wedding' } });

    // Internal input value updates instantly
    expect(inputEl.value).toBe('wedding');
    // Callback is NOT fired immediately
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('fires onChange callback only after debounce delay of 400ms', () => {
    const handleChange = vi.fn();
    render(<SearchBar value="" onChange={handleChange} />);
    const inputEl = screen.getByLabelText('Search');

    fireEvent.change(inputEl, { target: { value: 'pooja sets' } });

    // Advance timers by less than 400ms
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(handleChange).not.toHaveBeenCalled();

    // Advance timers to complete 400ms debounce
    act(() => {
      vi.advanceTimersByTime(200); // 250 + 200 = 450ms total
    });
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { value: 'pooja sets' } }),
    );
  });

  it('fires onChange immediately and clears input when the reset button is clicked', () => {
    const handleChange = vi.fn();
    render(<SearchBar value="marigold" onChange={handleChange} />);

    const clearBtn = screen.getByLabelText('Clear search');
    expect(clearBtn).toBeInTheDocument();

    // Click clear button
    fireEvent.click(clearBtn);

    const inputEl = screen.getByLabelText('Search');
    // Input is instantly empty
    expect(inputEl.value).toBe('');
    // Callback is immediately fired (no debounce delay needed for clearing)
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: '' } }));
  });

  it('synchronizes local input state with external value changes dynamically', () => {
    const { rerender } = render(<SearchBar value="original" onChange={() => {}} />);
    const inputEl = screen.getByLabelText('Search');
    expect(inputEl.value).toBe('original');

    // Rerender with a new external value prop
    rerender(<SearchBar value="updated external" onChange={() => {}} />);
    expect(inputEl.value).toBe('updated external');
  });
});
