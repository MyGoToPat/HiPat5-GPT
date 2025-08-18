import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: any) {
    return { hasError: true, message: String(err?.message || err) };
  }

  componentDidCatch(err: any, info: any) {
    console.error('[ErrorBoundary]', err, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh grid place-items-center bg-gray-950 text-gray-100 p-6">
          <div className="max-w-md text-center space-y-3">
            <div className="w-12 h-12 rounded-full border-4 border-gray-700 border-t-transparent animate-spin mx-auto" />
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-xs text-gray-400 break-words">{this.state.message}</p>
            <button
              className="mt-3 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-sm"
              onClick={() => location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}