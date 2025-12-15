import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md text-center border border-red-100 dark:border-red-900/50">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Đã xảy ra lỗi hệ thống</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Ứng dụng gặp sự cố không mong muốn. Vui lòng thử tải lại trang hoặc kiểm tra kết nối.
            </p>
            <div className="bg-gray-100 dark:bg-slate-900 p-3 rounded-lg text-xs text-left font-mono text-red-600 dark:text-red-400 overflow-auto max-h-32 mb-6">
               {this.state.error?.message || 'Unknown Error'}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors gap-2 text-sm font-medium w-full"
            >
              <RefreshCw size={16} /> Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}