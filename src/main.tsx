import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { register as registerServiceWorker } from './registerSW';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Daftarkan service worker untuk PWA (Progressive Web App) offline support
registerServiceWorker();
