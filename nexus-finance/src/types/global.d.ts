// Global types for service worker integration
declare global {
  interface Window {
    swRegistration: ServiceWorkerRegistration | null;
    swActive: ServiceWorker | null;
    deferredPrompt: any;
  }
}

export {};