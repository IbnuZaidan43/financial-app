'use client';

import { usePWA } from '@/hooks/usePWA';
import { useEffect, useState } from 'react';

export default function SimplePWATest() {
  const {
    isPWA,
    isInstallable,
    isStandalone,
    isOnline,
    platform,
    browser,
    canInstall,
    installPWA,
    dismissInstallPrompt
  } = usePWA();

  // State untuk client-side only checks
  const [clientChecks, setClientChecks] = useState({
    hasServiceWorker: false,
    hasManifest: false,
    isHTTPS: false,
    hasInstallSupport: false
  });

  useEffect(() => {
    // Client-side only checks
    setClientChecks({
      hasServiceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
      hasManifest: typeof document !== 'undefined' && !!document.querySelector('link[rel="manifest"]'),
      isHTTPS: typeof location !== 'undefined' && (location.protocol === 'https:' || location.hostname === 'localhost'),
      hasInstallSupport: typeof window !== 'undefined' && 'beforeinstallprompt' in window
    });
  }, []);

  // Debug function
  const debugPWA = () => {
    if (typeof window === 'undefined') return;
    
    console.log('=== PWA DEBUG INFO ===');
    console.log('Service Worker:', navigator.serviceWorker);
    console.log('Manifest:', document.querySelector('link[rel="manifest"]'));
    console.log('Install Support:', 'beforeinstallprompt' in window);
    console.log('Standalone Mode:', window.matchMedia('(display-mode: standalone)').matches);
    console.log('Deferred Prompt:', (window as any).deferredPrompt);
    console.log('HTTPS:', location.protocol === 'https:' || location.hostname === 'localhost');
    
    // Test manifest and icons
    fetch('/manifest.json')
      .then(r => r.json())
      .then(manifest => {
        console.log('✅ Manifest loaded:', manifest);
        // Test first icon
        if (manifest.icons && manifest.icons[0]) {
          fetch(manifest.icons[0].src)
            .then(r => console.log('✅ Icon accessible:', r.status, manifest.icons[0].src))
            .catch(e => console.error('❌ Icon not accessible:', e));
        }
      })
      .catch(e => console.error('❌ Manifest error:', e));
    
    console.log('======================');
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow">
      <h1 className="text-xl font-bold mb-4">🧪 Simple PWA Test</h1>
      
      <div className="space-y-3">
        <div className="flex justify-between">
          <span>📱 Is PWA:</span>
          <span className={`font-bold ${isPWA ? 'text-green-600' : 'text-blue-600'}`}>
            {isPWA ? 'YES ✅' : 'NO 🔵'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>🚀 Can Install:</span>
          <span className={`font-bold ${canInstall ? 'text-green-600' : 'text-red-600'}`}>
            {canInstall ? 'YES ✅' : 'NO 🔴'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>🌐 Is Online:</span>
          <span className={`font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {isOnline ? 'YES ✅' : 'NO 🔴'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>🖥️ Platform:</span>
          <span className="font-bold text-blue-600">{platform.toUpperCase()}</span>
        </div>
        
        <div className="flex justify-between">
          <span>🌍 Browser:</span>
          <span className="font-bold text-blue-600">{browser.toUpperCase()}</span>
        </div>
      </div>

      {canInstall && (
        <div className="mt-6 space-y-3">
          <button
            onClick={installPWA}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            📱 Install App
          </button>
          
          <button
            onClick={dismissInstallPrompt}
            className="w-full bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ❌ Dismiss
          </button>
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">📋 Test Checklist:</h3>
        <ul className="text-sm space-y-1">
          <li>✅ Service Worker: {clientChecks.hasServiceWorker ? 'Available' : 'Not Available'}</li>
          <li>✅ Manifest: {clientChecks.hasManifest ? 'Linked' : 'Not Linked'}</li>
          <li>✅ Install Prompt: {canInstall ? 'Available' : 'Not Available'}</li>
          <li>✅ PWA Detection: {isPWA ? 'Detected' : 'Not Detected'}</li>
          <li>✅ HTTPS/Localhost: {clientChecks.isHTTPS ? 'Yes' : 'No'}</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">🔧 Debug Info:</h3>
        <button
          onClick={debugPWA}
          className="w-full bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 mb-2"
        >
          🐛 Debug Console
        </button>
        <div className="text-xs font-mono bg-white p-2 rounded">
          <div>SW: {clientChecks.hasServiceWorker ? '✅' : '❌'}</div>
          <div>Manifest: {clientChecks.hasManifest ? '✅' : '❌'}</div>
          <div>Install: {clientChecks.hasInstallSupport ? '✅' : '❌'}</div>
          <div>HTTPS: {clientChecks.isHTTPS ? '✅' : '❌'}</div>
        </div>
      </div>

      {!canInstall && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-semibold mb-2 text-yellow-800">⚠️ Install Not Available</h3>
          <div className="text-sm text-yellow-700">
            <p>Possible reasons:</p>
            <ul className="ml-4 list-disc">
              <li>Already installed</li>
              <li>Not in Chrome/Edge</li>
              <li>Not on HTTPS</li>
              <li>Manifest invalid</li>
              <li>Service Worker not active</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}