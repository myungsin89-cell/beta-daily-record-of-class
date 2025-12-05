import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

console.log('Main.jsx is executing');

// Register service worker with Vite PWA
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('[PWA] New content available, dispatching swWaiting event');
    // Dispatch event for UpdatePrompt to catch
    const event = new CustomEvent('swWaiting', {
      detail: {
        updateSW
      }
    });
    window.dispatchEvent(event);
  },
  onOfflineReady() {
    console.log('[PWA] App ready to work offline');
  },
});

// Expose updateSW globally for UpdatePrompt
window.updateServiceWorker = updateSW;

createRoot(document.getElementById('root')).render(
  <App />
)
