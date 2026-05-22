import React, { Component } from 'react';
import * as Sentry from '@sentry/react';

import logger from '../../utils/logger';
/**
 * Enterprise-grade Error Boundary with:
 * - Sentry error reporting
 * - Retry mechanism
 * - Graceful fallback UI
 * - Error classification
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log to console in development
    logger.error('ErrorBoundary caught:', error, errorInfo);

    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo?.componentStack } },
    });
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkError = this.state.error?.message?.includes('Loading chunk') ||
        this.state.error?.message?.includes('Failed to fetch dynamically imported module');

      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-surface relative overflow-hidden"
          role="alert"
          aria-live="assertive"
        >
          {/* Subtle gold glow backdrop */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="max-w-lg w-full mx-auto relative z-10">
            {/* Elegant warning icon */}
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-rose-50/50 border border-rose-100/50 flex items-center justify-center shadow-2xs">
              <span className="material-symbols-outlined text-[36px] text-rose-500 font-light">
                error_outline
              </span>
            </div>

            <h1 className="font-display text-2xl md:text-3xl font-semibold text-on-surface mb-3 tracking-tight">
              {isChunkError ? 'Update Available' : 'Something went wrong'}
            </h1>

            <p className="font-body-md text-on-surface-variant/70 mb-8 text-sm md:text-base leading-relaxed max-w-sm mx-auto">
              {isChunkError
                ? 'A new version of the app is available. Please refresh to get the latest experience.'
                : 'Our studio encountered an unexpected error. We\'ve been notified and are working on it.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {this.state.retryCount < 3 && (
                <button
                  onClick={this.handleRetry}
                  className="px-8 py-3 bg-on-surface hover:bg-primary hover:text-surface text-surface rounded-full font-label text-[11px] uppercase tracking-widest font-bold transition-all hover:shadow-xl active:scale-95 cursor-pointer flex-1 sm:flex-none"
                  aria-label="Try again"
                >
                  {isChunkError ? 'Refresh App' : 'Try Again'}
                </button>
              )}
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-surface border border-outline-variant/30 text-on-surface hover:bg-surface-container rounded-full font-label text-[11px] uppercase tracking-widest font-bold transition-all active:scale-95 cursor-pointer flex-1 sm:flex-none"
                aria-label="Reload page"
              >
                Reload Page
              </button>
            </div>

            {/* Navigation fallback */}
            <div className="mt-10 pt-6 border-t border-outline-variant/20">
              <p className="font-label-sm text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/40 mb-4 font-bold">Or navigate to:</p>
              <div className="flex items-center justify-center gap-4 text-xs font-label uppercase tracking-widest font-bold">
                <a href="/" className="text-primary hover:underline">Home</a>
                <span className="text-outline-variant/50">·</span>
                <a href="/collections" className="text-primary hover:underline">Collections</a>
                <span className="text-outline-variant/50">·</span>
                <a href="/contact" className="text-primary hover:underline">Contact</a>
              </div>
            </div>

            {/* Dev-only error details */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-8 text-left bg-surface-container border border-outline-variant/30 rounded-2xl p-4 text-xs">
                <summary className="cursor-pointer font-bold text-on-surface-variant uppercase tracking-wider text-[10px] select-none">
                  Error Details (dev only)
                </summary>
                <pre className="whitespace-pre-wrap text-rose-600 mt-2 overflow-auto max-h-40 font-mono text-[10px] leading-normal">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
