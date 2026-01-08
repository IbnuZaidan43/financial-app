'use client';

import { useState, useEffect } from 'react';

export interface PWAInfo {
  isPWA: boolean;
  isInstallable: boolean;
  isStandalone: boolean;
  isOnline: boolean;
  platform: 'web' | 'pwa' | 'ios' | 'android';
  browser: string;
  canInstall: boolean;
  installPrompt: any | null;
}

export function usePWA() {
  const [pwaInfo, setPwaInfo] = useState<PWAInfo>({
    isPWA: false,
    isInstallable: false,
    isStandalone: false,
    isOnline: true,
    platform: 'web',
    browser: 'unknown',
    canInstall: false,
    installPrompt: null,
  });

  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Detect if running as PWA
  const detectPWA = (): boolean => {
    // Check display mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
    const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
    
    // iOS Safari standalone mode
    const isIOSStandalone = (window.navigator as any).standalone === true;
    
    // Check if running from home screen
    const isWebApp = document.referrer.includes('android-app://');
    
    return isStandalone || isFullscreen || isMinimalUI || isIOSStandalone || isWebApp;
  };

  // Detect platform
  const detectPlatform = (): 'web' | 'pwa' | 'ios' | 'android' => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isPWA = detectPWA();
    
    if (isPWA) {
      if (/iphone|ipad|ipod/.test(userAgent)) {
        return 'ios';
      } else if (/android/.test(userAgent)) {
        return 'android';
      }
      return 'pwa';
    }
    
    return 'web';
  };

  // Detect browser
  const detectBrowser = (): string => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      return 'chrome';
    } else if (userAgent.includes('firefox')) {
      return 'firefox';
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      return 'safari';
    } else if (userAgent.includes('edg')) {
      return 'edge';
    } else if (userAgent.includes('opera') || userAgent.includes('opr')) {
      return 'opera';
    }
    
    return 'unknown';
  };

  // Check if installable
  const checkInstallable = (): boolean => {
    return 'beforeinstallprompt' in window;
  };

  // Check online status
  const checkOnlineStatus = (): boolean => {
    return navigator.onLine;
  };

  // Handle beforeinstallprompt event
  const handleBeforeInstallPrompt = (e: Event) => {
    console.log('📱 Install prompt detected');
    e.preventDefault();
    setInstallPrompt(e);
    setPwaInfo(prev => ({
      ...prev,
      canInstall: true,
      installPrompt: e
    }));
  };

  // Handle appinstalled event
  const handleAppInstalled = () => {
    console.log('✅ App installed successfully');
    setInstallPrompt(null);
    setPwaInfo(prev => ({
      ...prev,
      canInstall: false,
      installPrompt: null,
      isPWA: true,
      isStandalone: true,
      platform: detectPlatform()
    }));
  };

  // Handle online/offline events
  const handleOnline = () => {
    console.log('🟢 Back online');
    setPwaInfo(prev => ({ ...prev, isOnline: true }));
  };

  const handleOffline = () => {
    console.log('🔴 Gone offline');
    setPwaInfo(prev => ({ ...prev, isOnline: false }));
  };

  // Install the PWA
  const installPWA = async (): Promise<boolean> => {
    if (!installPrompt) {
      console.log('❌ Install prompt not available');
      return false;
    }

    try {
      console.log('📱 Showing install prompt');
      const result = await installPrompt.prompt();
      
      if (result.outcome === 'accepted') {
        console.log('✅ User accepted install');
        setInstallPrompt(null);
        setPwaInfo(prev => ({
          ...prev,
          canInstall: false,
          installPrompt: null
        }));
        return true;
      } else {
        console.log('❌ User dismissed install');
        return false;
      }
    } catch (error) {
      console.error('❌ Error during install:', error);
      return false;
    }
  };

  // Dismiss install prompt
  const dismissInstallPrompt = () => {
    setInstallPrompt(null);
    setPwaInfo(prev => ({
      ...prev,
      canInstall: false,
      installPrompt: null
    }));
  };

  // Manual install instructions for iOS
  const getIOSInstallInstructions = (): string[] => {
    return [
      'Tap the Share button in Safari',
      'Scroll down and tap "Add to Home Screen"',
      'Tap "Add" to install the app',
      'The app will appear on your home screen'
    ];
  };

  // Manual install instructions for Android
  const getAndroidInstallInstructions = (): string[] => {
    return [
      'Tap the menu button (three dots) in Chrome',
      'Tap "Add to Home screen" or "Install app"',
      'Tap "Install" to confirm',
      'The app will appear on your home screen'
    ];
  };

  // Get install instructions based on platform
  const getInstallInstructions = (): string[] => {
    const platform = detectPlatform();
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return getIOSInstallInstructions();
    } else if (/android/.test(userAgent)) {
      return getAndroidInstallInstructions();
    }
    
    return [
      'Look for the install button in your browser',
      'Follow the on-screen instructions',
      'The app will be installed on your device'
    ];
  };

  // Initialize PWA detection
  useEffect(() => {
    const updatePWAInfo = () => {
      const isPWA = detectPWA();
      const platform = detectPlatform();
      const browser = detectBrowser();
      const canInstall = checkInstallable();
      const isOnline = checkOnlineStatus();
      const isStandalone = detectPWA();

      setPwaInfo({
        isPWA,
        isInstallable: canInstall,
        isStandalone,
        isOnline,
        platform,
        browser,
        canInstall: !!installPrompt,
        installPrompt
      });

      console.log('📱 PWA Info updated:', {
        isPWA,
        platform,
        browser,
        canInstall,
        isOnline,
        isStandalone
      });
    };

    // Initial detection
    updatePWAInfo();

    // Listen for install prompt (window level)
    const handleWindowInstallPrompt = (e: any) => {
      console.log('📱 Install prompt detected in window listener');
      handleBeforeInstallPrompt(e);
    };

    const handleWindowAppInstalled = () => {
      console.log('✅ App installed detected in window listener');
      handleAppInstalled();
    };

    // Listen for window events
    window.addEventListener('beforeinstallprompt', handleWindowInstallPrompt);
    window.addEventListener('appinstalled', handleWindowAppInstalled);

    // Listen for online/offline
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => updatePWAInfo();
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleWindowInstallPrompt);
      window.removeEventListener('appinstalled', handleWindowAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, [installPrompt]);

  return {
    ...pwaInfo,
    installPWA,
    dismissInstallPrompt,
    getInstallInstructions,
    getIOSInstallInstructions,
    getAndroidInstallInstructions
  };
}