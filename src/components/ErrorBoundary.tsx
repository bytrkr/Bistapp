import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[React ErrorBoundary caught error]:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">BIST Terminal Arayüz Kurtarma</h2>
              <p className="text-xs text-slate-400 mt-1">
                Arayüz bileşeni başlatılırken bir render hatası yakalandı. Sayfayı yenileyerek terminali yeniden yükleyebilirsiniz.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 text-left">
                <span className="text-[10px] font-mono text-rose-300 break-all block">
                  {this.state.error.message}
                </span>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sayfayı Yeniden Yükle</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
export default ErrorBoundary;