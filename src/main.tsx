import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { setupGlobalAuthFetch } from './utils/api';

// 🌍 Global API Interceptor: Tüm fetch çağrılarına Auth Header ekler
try {
  setupGlobalAuthFetch();
} catch (err) {
  console.warn('[MT16] Global fetch interceptor bypass edildi, manuel auth kullanılıyor.');
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
}