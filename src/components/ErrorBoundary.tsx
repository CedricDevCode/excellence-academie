import { Component, type ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const CHUNK_ERROR_PATTERNS = [
  "Failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "Importing a module script failed",
  "dynamically imported module",
  "ChunkLoadError",
  "Loading chunk",
  "Loading CSS chunk",
];

export function isChunkLoadError(error: unknown): boolean {
  const message = String((error as any)?.message || error || "");
  return CHUNK_ERROR_PATTERNS.some((p) => message.includes(p));
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    if (isChunkLoadError(error)) {
      const key = "chunk-reload-attempted";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const chunkError = isChunkLoadError(this.state.error);
      return this.props.fallback || (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary-700">
              {chunkError ? <RefreshCw size={28} /> : <AlertTriangle size={28} />}
            </div>
            <h2 className="text-lg font-black text-surface-900 mb-2">
              {chunkError ? "Mise à jour du site disponible" : "Une erreur est survenue"}
            </h2>
            <p className="text-sm text-surface-500 mb-6">
              {chunkError
                ? "Le site a été mis à jour. Rechargez la page pour obtenir la dernière version."
                : "Quelque chose s'est mal passé. Essayez de recharger la page."}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  sessionStorage.removeItem("chunk-reload-attempted");
                  window.location.reload();
                }}
                className="px-5 py-2.5 bg-primary-600 text-white text-sm font-bold rounded hover:bg-primary-700 transition-colors"
              >
                Recharger la page
              </button>
              <a
                href="/"
                className="px-5 py-2.5 border border-surface-300 text-surface-600 text-sm font-semibold rounded hover:border-surface-400 hover:text-surface-800 transition-colors"
              >
                Accueil
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
