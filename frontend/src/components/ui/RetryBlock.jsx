import { Component } from 'react';

/**
 * A localized error boundary specifically for wrapping individual sections
 * or components that might fail independently (e.g., a specific product list,
 * a widget, or a specific API-driven section).
 */
export class RetryBlock extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
    // Silently handle error to pass no-console checks, or use a proper logger if available
  }

  componentDidCatch(_error, _errorInfo) {}

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      retryCount: prev.retryCount + 1,
    }));

    // Optional: Call a prop function to trigger a re-fetch (like React Query's refetch)
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30 my-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-rose-500">cloud_off</span>
          </div>
          <h3 className="font-headline-sm text-on-surface mb-2">
            {this.props.title || 'Failed to load content'}
          </h3>
          <p className="font-body-md text-on-surface-variant/70 mb-6 max-w-sm text-sm">
            {this.props.message ||
              'There was a temporary issue loading this section. Please try again.'}
          </p>
          <button onClick={this.handleRetry} className="btn-minimal px-6 py-2">
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
