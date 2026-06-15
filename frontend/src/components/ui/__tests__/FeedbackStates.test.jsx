import { EmptyState, ErrorState } from '../FeedbackStates';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('FeedbackStates Component Suites', () => {
  describe('EmptyState Component', () => {
    it('renders default titles and description if no props are supplied', () => {
      render(<EmptyState />);
      expect(screen.getByText('Nothing found')).toBeInTheDocument();
      expect(screen.getByText("We couldn't find what you were looking for.")).toBeInTheDocument();
      expect(screen.getByText('search_off')).toBeInTheDocument(); // Default icon
    });

    it('renders custom title, description, and icon', () => {
      render(
        <EmptyState
          title="No wedding items available"
          description="Please check back in wedding season."
          icon="event_busy"
        />,
      );
      expect(screen.getByText('No wedding items available')).toBeInTheDocument();
      expect(screen.getByText('Please check back in wedding season.')).toBeInTheDocument();
      expect(screen.getByText('event_busy')).toBeInTheDocument();
    });

    it('renders a custom action CTA button if actionLabel prop is provided', () => {
      const handleActionClick = vi.fn();
      render(<EmptyState actionLabel="Clear Filters" onAction={handleActionClick} />);

      const actionButton = screen.getByRole('button', { name: /clear filters/i });
      expect(actionButton).toBeInTheDocument();

      fireEvent.click(actionButton);
      expect(handleActionClick).toHaveBeenCalledTimes(1);
    });

    it('does not render CTA button if actionLabel prop is absent', () => {
      render(<EmptyState />);
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBe(0);
    });
  });

  describe('ErrorState Component', () => {
    it('renders default titles and description if no props are supplied', () => {
      render(<ErrorState />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(
        screen.getByText("We're having trouble loading this right now. Please try again later."),
      ).toBeInTheDocument();
      expect(screen.getByText('error_outline')).toBeInTheDocument();
    });

    it('renders custom error text', () => {
      render(
        <ErrorState
          title="Network Connection Timed Out"
          description="Please verify your internet router status."
        />,
      );
      expect(screen.getByText('Network Connection Timed Out')).toBeInTheDocument();
      expect(screen.getByText('Please verify your internet router status.')).toBeInTheDocument();
    });

    it('renders retry button and fires onRetry handler when clicked', () => {
      const handleRetry = vi.fn();
      render(<ErrorState onRetry={handleRetry} />);

      const retryBtn = screen.getByRole('button', { name: /try again/i });
      expect(retryBtn).toBeInTheDocument();

      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it('does not render retry button if onRetry prop is absent', () => {
      render(<ErrorState />);
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBe(0);
    });
  });
});
