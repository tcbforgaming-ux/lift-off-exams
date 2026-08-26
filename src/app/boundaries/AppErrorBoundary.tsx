import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "../../components/ui/Button";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Application boundary caught an error", error, errorInfo);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="boundary-page">
        <section className="surface-card boundary-card" role="alert">
          <p className="eyebrow">Application Error</p>
          <h1>Something stopped the page from rendering.</h1>
          <p className="muted">
            Refresh the app and try again. If this repeats, capture the latest browser
            console message before continuing.
          </p>
          <pre className="error-snippet">{this.state.error.message}</pre>
          <Button onClick={() => window.location.reload()}>Reload App</Button>
        </section>
      </main>
    );
  }
}
