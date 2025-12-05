import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

console.log('Main.jsx is executing');

// Service Worker registration with update detection
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('[Client] SW registered:', registration);

        // Check for updates on load
        registration.update();

        // Listen for updatefound event
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('[Client] New service worker found, installing...');

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              console.log('[Client] New SW state:', newWorker.state);

              // When new SW enters waiting state, notify the app
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[Client] New SW is waiting. Dispatching custom event...');

                // Dispatch custom event for React app to listen
                const event = new CustomEvent('swWaiting', {
                  detail: { registration }
                });
                window.dispatchEvent(event);
              }
            });
          }
        });

        // Listen for controllerchange event (when new SW takes control)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[Client] New service worker activated. Reloading page...');
          window.location.reload();
        });
      })
      .catch((error) => {
        console.log('[Client] SW registration failed:', error);
      });
  });
}

// Helper function to send activation message to waiting SW
window.updateServiceWorker = function () {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }
};

createRoot(document.getElementById('root')).render(
  <App />
)


