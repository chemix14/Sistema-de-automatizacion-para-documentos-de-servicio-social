import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Enrutador dinámico para pruebas en red local (LAN)
if (typeof window !== 'undefined') {
  const currentHost = window.location.hostname || 'localhost';
  const backendTarget = `http://${currentHost}:5000`;

  const originalFetch = window.fetch;
  window.fetch = function (resource, options) {
    if (typeof resource === 'string') {
      resource = resource
        .replace('http://localhost:5000', backendTarget)
        .replace('http://127.0.0.1:5000', backendTarget);
    }
    return originalFetch.call(this, resource, options);
  };

  const originalOpen = window.open;
  window.open = function (url, target, features) {
    if (typeof url === 'string') {
      url = url
        .replace('http://localhost:5000', backendTarget)
        .replace('http://127.0.0.1:5000', backendTarget);
    }
    return originalOpen.call(this, url, target, features);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
