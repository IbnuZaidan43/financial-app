'use client';

import { useState, useEffect } from 'react';
import { 
  Download, 
  X, 
  Smartphone, 
  Monitor, 
  Chrome, 
  Globe,
  Compass,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PWAInstallPromptProps {
  className?: string;
  showInstructions?: boolean;
  autoHide?: boolean;
  position?: 'top' | 'bottom' | 'floating';
}

export default function PWAInstallPrompt({ 
  className = '',
  showInstructions = true,
  autoHide = true,
  position = 'bottom'
}: PWAInstallPromptProps) {
  const {
    canInstall,
    isInstallable,
    platform,
    browser,
    installPWA,
    dismissInstallPrompt,
    getInstallInstructions
  } = usePWA();

  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'success' | 'error'>('idle');

  useEffect(() => {
    const checkInstalled = () => {
      const isPWAInstalled = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      
      setIsInstalled(isPWAInstalled);
    };

    checkInstalled();
    window.addEventListener('appinstalled', checkInstalled);
    
    return () => window.removeEventListener('appinstalled', checkInstalled);
  }, []);

  useEffect(() => {
    if (autoHide && isInstalled) {
      setIsVisible(false);
    } else if (canInstall && !dismissed && !isInstalled) {
      // Show after 3 seconds
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [canInstall, dismissed, isInstalled, autoHide]);

  useEffect(() => {
    const handleAppInstalled = () => {
      setInstallStatus('success');
      setIsInstalled(true);
      setTimeout(() => {
        setIsVisible(false);
        setInstallStatus('idle');
      }, 3000);
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    return () => window.removeEventListener('appinstalled', handleAppInstalled);
  }, []);

  const handleInstall = async () => {
    setInstallStatus('installing');
    try {
      await installPWA();
      setInstallStatus('success');
    } catch (error) {
      console.error('Install failed:', error);
      setInstallStatus('error');
      setTimeout(() => setInstallStatus('idle'), 3000);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setIsVisible(false);
    dismissInstallPrompt();
  };

  if (isInstalled || !canInstall || !isVisible) {
    return null;
  }

  const getBrowserIcon = () => {
    const b = browser.toLowerCase();
    if (b.includes('safari')) return <Compass className="w-4 h-4" />;
    if (b.includes('chrome') || b.includes('edge') || b.includes('firefox')) return <Globe className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'fixed top-4 left-4 right-4 z-50';
      case 'bottom':
        return 'fixed bottom-4 left-4 right-4 z-50';
      case 'floating':
        return 'fixed bottom-6 right-6 z-50 max-w-sm';
      default:
        return 'fixed bottom-4 left-4 right-4 z-50';
    }
  };

  if (position === 'floating') {
    return (
      <div className={`${getPositionClasses()} ${className}`}>
        <Card className="shadow-lg border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <Download className="w-5 h-5 text-blue-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 mb-1">
                  Install Aplikasi Keuangan
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Akses lebih cepat, offline mode, dan experience seperti aplikasi native
                </p>
                
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">
                    {getBrowserIcon()}
                    <span className="ml-1">{browser}</span>
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Smartphone className="w-3 h-3 mr-1" />
                    {platform}
                  </Badge>
                </div>

                {installStatus === 'installing' && (
                  <div className="flex items-center gap-2 text-blue-600 text-sm mb-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Menginstall...</span>
                  </div>
                )}

                {installStatus === 'success' && (
                  <div className="flex items-center gap-2 text-green-600 text-sm mb-3">
                    <CheckCircle className="w-4 h-4" />
                    <span>Berhasil diinstall!</span>
                  </div>
                )}

                {installStatus === 'error' && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mb-3">
                    <AlertCircle className="w-4 h-4" />
                    <span>Install gagal. Coba lagi.</span>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleInstall}
                    disabled={installStatus === 'installing'}
                    size="sm"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {installStatus === 'installing' ? 'Installing...' : 'Install'}
                  </Button>
                  <Button 
                    onClick={handleDismiss}
                    variant="outline"
                    size="sm"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`${getPositionClasses()} ${className}`}>
      <Card className="shadow-lg border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-full">
                <Download className="w-5 h-5 text-blue-600" />
              </div>
              Install Aplikasi Keuangan
            </CardTitle>
            <Button 
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">
              {getBrowserIcon()}
              <span className="ml-1">{browser}</span>
            </Badge>
            <Badge variant="outline">
              <Smartphone className="w-3 h-3 mr-1" />
              {platform}
            </Badge>
            {isInstallable && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Ready to Install
              </Badge>
            )}
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">✨ Keuntungan Install:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Akses cepat dari home screen</li>
              <li>• Offline mode - bisa digunakan tanpa internet</li>
              <li>• Experience seperti aplikasi native</li>
              <li>• Notifikasi dan update otomatis</li>
              <li>• Data tersimpan lokal di device</li>
            </ul>
          </div>

          {installStatus === 'installing' && (
            <div className="flex items-center gap-2 text-blue-600 p-3 bg-blue-50 rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Sedang menginstall aplikasi...</span>
            </div>
          )}

          {installStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              <span>Aplikasi berhasil diinstall! 🎉</span>
            </div>
          )}

          {installStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600 p-3 bg-red-50 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span>Install gagal. Silakan coba lagi.</span>
            </div>
          )}
          
          <div className="flex gap-3">
            <Button 
              onClick={handleInstall}
              disabled={installStatus === 'installing'}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              {installStatus === 'installing' ? 'Installing...' : 'Install Sekarang'}
            </Button>
            <Button 
              onClick={handleDismiss}
              variant="outline"
            >
              Nanti Saja
            </Button>
          </div>

          {showInstructions && !canInstall && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-amber-800 mb-1">Cara Install:</h5>
                  <ol className="text-sm text-amber-700 space-y-1">
                    {getInstallInstructions().map((instruction, index) => (
                      <li key={index}>{index + 1}. {instruction}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}