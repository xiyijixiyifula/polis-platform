'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught React error:', error.message);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[50vh] items-center justify-center p-8">
          <div className="glass-card max-w-md w-full text-center space-y-4 p-8">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-xl font-semibold" style={{ color: '#1d1d1f' }}>
              页面出错了
            </h2>
            <p className="text-sm text-gray-500">
              {this.state.error?.message || '组件渲染时发生意外错误'}
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={this.handleRetry}
                className="glass-btn px-4 py-2 text-sm font-medium rounded-full"
                style={{ color: '#007aff' }}
              >
                重试
              </button>
              <button
                onClick={() => window.location.reload()}
                className="glass-btn px-4 py-2 text-sm font-medium rounded-full"
              >
                刷新页面
              </button>
              <a
                href="/"
                className="glass-btn px-4 py-2 text-sm font-medium rounded-full"
              >
                返回首页
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function SilentErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="glass-card p-6 text-center text-gray-400 text-sm">
          内容加载失败
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
