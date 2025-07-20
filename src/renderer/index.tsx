import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';

// Global error handlers
window.addEventListener('error', (event) => {
  // Always log errors for production monitoring
  window.api?.logError?.({
    message: event.error?.message || 'Unknown error',
    stack: event.error?.stack,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  // Always log promise rejections for production monitoring
  window.api?.logError?.({
    message: event.reason?.message || 'Unhandled promise rejection',
    stack: event.reason?.stack,
    reason: String(event.reason)
  });
});

// Render the React app
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <GlobalErrorBoundary>
    <App />
  </GlobalErrorBoundary>
);

