import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Automatically proxy API requests in production (when not on Vite dev port 5173)
if (typeof window !== 'undefined' && window.location.port !== '5173') {
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    if (typeof url === 'string' && url.includes(':8000/api/')) {
      url = url.replace(/https?:\/\/[^/]+:8000\/api\//, '/api/');
    }
    return originalFetch(url, options);
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
