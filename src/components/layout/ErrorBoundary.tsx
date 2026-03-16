import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    void error;
    void errorInfo;
    // Intentionally silent in UI; can be wired to logging service later.
  }

  private handleReset = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-2xl border border-error/20 bg-error/5 p-6 text-center"
          dir="rtl"
        >
          <p className="font-heading text-xl font-bold text-textPrimary">
            حصل خطأ — حاول تحديث الصفحة
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-4 rounded-xl bg-primary px-4 py-2 font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
          >
            حدّث الصفحة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
