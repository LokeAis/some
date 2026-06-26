import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: unknown): State {
    let errorObj: Error;
    if (error instanceof Error) {
      errorObj = error;
    } else if (error && typeof error === 'object') {
      try {
        errorObj = new Error(JSON.stringify(error));
      } catch (e) {
        errorObj = new Error(String(error));
      }
    } else {
      errorObj = new Error(String(error));
    }
    return { hasError: true, error: errorObj };
  }

  public componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ein ukjend feil oppstod.";
      let errorDetails = null;

      try {
        if (this.state.error?.message) {
          const parsedError = JSON.parse(this.state.error.message);
          if (parsedError.error) {
            errorMessage = parsedError.error;
            errorDetails = parsedError;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-200 max-w-lg w-full">
            <h2 className="text-2xl font-bold text-red-700 mb-4">Noko gjekk gale</h2>
            <p className="text-neutral-700 mb-4">
              {errorMessage}
            </p>
            {errorDetails && (
              <div className="mt-4 p-4 bg-neutral-100 rounded-lg overflow-auto text-xs font-mono text-neutral-600">
                <pre>{JSON.stringify(errorDetails, null, 2)}</pre>
              </div>
            )}
            <button
              className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              onClick={() => window.location.reload()}
            >
              Last sida på nytt
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
