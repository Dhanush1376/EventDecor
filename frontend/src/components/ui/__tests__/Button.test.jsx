import { Button } from '../Button';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('Button Component', () => {
  it('renders children text content correctly', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('applies primary variant classes by default', () => {
    render(<Button>Primary Button</Button>);
    const buttonEl = screen.getByRole('button', { name: /primary button/i });
    expect(buttonEl).toHaveClass('btn-primary');
  });

  it('applies correct custom variant styling classes', () => {
    const { rerender } = render(<Button variant="outline">Outline Button</Button>);
    let buttonEl = screen.getByRole('button', { name: /outline button/i });
    expect(buttonEl).toHaveClass('btn-outline');

    rerender(<Button variant="ghost">Ghost Button</Button>);
    buttonEl = screen.getByRole('button', { name: /ghost button/i });
    expect(buttonEl).toHaveClass('bg-transparent');
    expect(buttonEl).toHaveClass('text-secondary');
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    let buttonEl = screen.getByRole('button', { name: /small/i });
    expect(buttonEl).toHaveClass('!px-5');
    expect(buttonEl).toHaveClass('!py-2.5');

    rerender(<Button size="lg">Large</Button>);
    buttonEl = screen.getByRole('button', { name: /large/i });
    expect(buttonEl).toHaveClass('!px-14');
    expect(buttonEl).toHaveClass('!py-5');
  });

  it('triggers onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Interactive</Button>);
    const buttonEl = screen.getByRole('button', { name: /interactive/i });

    fireEvent.click(buttonEl);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders visual icon from material symbols if icon prop is provided', () => {
    render(<Button icon="favorite">Favorite</Button>);
    expect(screen.getByText('favorite')).toBeInTheDocument();
    expect(screen.getByText('favorite')).toHaveClass('material-symbols-outlined');
  });

  it('renders with full width styling when fullWidth prop is true', () => {
    render(<Button fullWidth={true}>Full Width</Button>);
    const buttonEl = screen.getByRole('button', { name: /full width/i });
    expect(buttonEl).toHaveClass('w-full');
  });
});
