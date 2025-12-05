import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', backgroundColor: '#fee', border: '2px solid #f00', borderRadius: '8px', margin: '2rem' }}>
          <h2>? ï¸ ?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>?¤ë¥˜ ?ì„¸ ?•ë³´</summary>
            <p style={{ marginTop: '1rem' }}><strong>?¤ë¥˜:</strong> {this.state.error && this.state.error.toString()}</p>
            <p><strong>?¤íƒ ì¶”ì :</strong></p>
            <pre style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </details>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            ?˜ì´ì§€ ?ˆë¡œê³ ì¹¨
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
