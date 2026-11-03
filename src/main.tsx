import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

const Page = React.lazy(() => window.location.pathname === '/admin' ? import('./Admin') : import('./App'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><React.Suspense fallback={<div style={{ minHeight: '100vh', background: '#08090b' }} />}><Page /></React.Suspense></React.StrictMode>,
);
