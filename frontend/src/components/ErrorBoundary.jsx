import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isEn = typeof window !== 'undefined' && localStorage.getItem('lang') === 'en';
      return (
        <div style={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'var(--bg-main, #f8fafc)',
          fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1.5px solid rgba(239, 68, 68, 0.3)',
            padding: '28px 24px',
            boxShadow: '0 10px 30px rgba(0, 45, 84, 0.12)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertTriangle size={30} />
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-navy, #002D54)', margin: '0 0 8px' }}>
              {isEn ? 'A display issue occurred' : 'Đã xảy ra sự cố hiển thị'}
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
              {isEn 
                ? 'An unexpected error occurred while rendering this page. You can try refreshing or go back to home.' 
                : 'Một lỗi giao diện bất ngờ đã xảy ra khi tải trang này. Bạn có thể bấm tải lại hoặc quay về trang chủ.'}
            </p>

            {this.state.error && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '20px',
                textAlign: 'left',
                maxHeight: '120px',
                overflowY: 'auto',
                fontSize: '0.78rem',
                fontFamily: 'monospace',
                color: '#b91c1c'
              }}>
                <b>{isEn ? 'Error:' : 'Lỗi:'}</b> {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #00A3A6 0%, #002D54 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 163, 166, 0.3)'
                }}
              >
                <RefreshCw size={15} />
                <span>{isEn ? 'Reload Page' : 'Tải lại trang'}</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  color: 'var(--primary-navy, #002D54)',
                  border: '1px solid #cbd5e1',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                <Home size={15} />
                <span>{isEn ? 'Home' : 'Trang chủ'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
