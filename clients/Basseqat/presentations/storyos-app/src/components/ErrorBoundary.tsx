import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Presentation crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-amber-300">Presentation Error</p>
            <h1 className="mb-4 text-2xl font-bold">Unable to render this deck.</h1>
            <p className="mb-4 text-sm text-slate-300">
              Check the slide data structure, then refresh the preview.
            </p>
            <pre className="max-h-40 overflow-auto rounded-xl bg-slate-900 p-3 text-left text-xs text-red-300">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full bg-amber-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              Reload Preview
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
