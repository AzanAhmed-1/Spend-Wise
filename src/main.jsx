import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
            background: '#0f172a',
            color: '#f8fafc',
          }}
        >
          <h1 style={{ fontSize: 18, marginBottom: 12 }}>Something went wrong</h1>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: 13,
              color: '#fda4af',
              background: '#1e293b',
              padding: 16,
              borderRadius: 8,
            }}
          >
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <p style={{ color: '#94a3b8', marginTop: 16, fontSize: 14 }}>
            Open DevTools (F12) → Console for the full stack trace. Make sure you run <code>npm start</code> from the
            Financer folder and open the URL Vite prints (not an old port).
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

const el = document.getElementById('root');
if (!el) {
  throw new Error('Missing #root in index.html');
}

ReactDOM.createRoot(el).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
