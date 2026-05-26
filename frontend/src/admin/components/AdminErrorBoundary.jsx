import React from"react";

import logger from '../../utils/logger';
/**
 * Error Boundary for Admin Portal sections.
 * Catches JavaScript errors in child component tree and shows
 * a graceful fallback UI instead of crashing the entire admin panel.
 */
export class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    logger.error("[Admin Error Boundary]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-14 h-14 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[24px] text-rose-500">
              warning
            </span>
          </div>
          <h2 className="text-[16px] font-bold text-slate-800 tracking-tight mb-2">
            Something went wrong
          </h2>
          <p className="text-[12px] text-slate-505 max-w-md mb-6 leading-relaxed">
            This section encountered an unexpected error. Your data is safe — 
            try refreshing the section or contact support if the issue persists.
          </p>
          {this.state.error && (
            <details className="text-left bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 max-w-lg w-full">
              <summary className="text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none outline-none">
                Error Details
              </summary>
              <pre className="text-[11px] text-rose-600 mt-2 whitespace-pre-wrap overflow-auto max-h-[200px] font-mono leading-normal">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-black hover:bg-slate-900 text-white rounded-lg text-[11px] sm:text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[15px]">refresh</span>
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:text-slate-905 hover:bg-slate-50 rounded-lg text-[11px] sm:text-[11px] font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AdminErrorBoundary;
