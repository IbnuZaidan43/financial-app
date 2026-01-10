'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
  position?: 'top' | 'bottom' | 'floating';
  autoHide?: boolean;
  onReconnect?: () => void;
}

interface ConnectionInfo {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  lastChecked: Date;
}

export default function OfflineIndicator({
  className = '',
  showDetails = false,
  position = 'top',
  autoHide = true,
  onReconnect
}: OfflineIndicatorProps) {
  const { isOnline } = usePWA();
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    isOnline: true,
    lastChecked: new Date()
  });
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  // Enhanced connection detection
  useEffect(() => {
    const updateConnectionInfo = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;

      setConnectionInfo({
        isOnline: navigator.onLine,
        connectionType: connection?.type,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
        saveData: connection?.saveData,
        lastChecked: new Date()
      });

      // Show offline alert when going offline
      if (!navigator.onLine && autoHide) {
        setShowOfflineAlert(true);
      } else if (navigator.onLine) {
        setShowOfflineAlert(false);
      }
    };

    // Initial check
    updateConnectionInfo();

    // Listen for online/offline events
    const handleOnline = () => {
      updateConnectionInfo();
      setIsReconnecting(false);
    };

    const handleOffline = () => {
      updateConnectionInfo();
    };

    // Listen for connection changes
    const handleConnectionChange = () => {
      updateConnectionInfo();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Periodic check every 30 seconds
    const interval = setInterval(updateConnectionInfo, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
      clearInterval(interval);
    };
  }, [autoHide]);

  const handleManualReconnect = async () => {
    setIsReconnecting(true);
    
    try {
      // Try to fetch a small resource to test connection
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        setConnectionInfo(prev => ({
          ...prev,
          isOnline: true,
          lastChecked: new Date()
        }));
        setShowOfflineAlert(false);
        onReconnect?.();
      }
    } catch (error) {
      console.error('Reconnect failed:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  const getConnectionQuality = () => {
    if (!connectionInfo.effectiveType) return 'unknown';
    
    switch (connectionInfo.effectiveType) {
      case '4g': return 'excellent';
      case '3g': return 'good';
      case '2g': return 'poor';
      case 'slow-2g': return 'very-poor';
      default: return 'unknown';
    }
  };

  const getQualityColor = () => {
    const quality = getConnectionQuality();
    switch (quality) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'poor': return 'text-orange-600 bg-orange-100';
      case 'very-poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'fixed top-4 left-4 right-4 z-50';
      case 'bottom':
        return 'fixed bottom-4 left-4 right-4 z-50';
      case 'floating':
        return 'fixed top-4 right-4 z-50';
      default:
        return 'fixed top-4 left-4 right-4 z-50';
    }
  };

  // Simple badge version
  if (!showDetails && position === 'floating') {
    return (
      <div className={`${getPositionClasses()} ${className}`}>
        <Badge 
          variant={connectionInfo.isOnline ? "default" : "destructive"}
          className="flex items-center gap-2 px-3 py-2"
        >
          {connectionInfo.isOnline ? (
            <>
              <Wifi className="w-4 h-4" />
              <span className="text-xs">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              <span className="text-xs">Offline</span>
            </>
          )}
        </Badge>
      </div>
    );
  }

  // Full offline alert (only when offline)
  if (!connectionInfo.isOnline && showOfflineAlert) {
    return (
      <div className={`${getPositionClasses()} ${className}`}>
        <Card className="border-red-200 bg-red-50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-red-100 p-2 rounded-full">
                <WifiOff className="w-5 h-5 text-red-600" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">
                  Anda Sedang Offline
                </h3>
                <p className="text-sm text-red-700 mb-3">
                  Aplikasi berjalan dalam mode offline. Beberapa fitur mungkin tidak tersedia.
                </p>
                
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs">
                    <XCircle className="w-3 h-3 mr-1" />
                    No Internet Connection
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Terakhir diperiksa: {connectionInfo.lastChecked.toLocaleTimeString()}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleManualReconnect}
                    disabled={isReconnecting}
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-100"
                  >
                    {isReconnecting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Mencoba...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Coba Lagi
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={() => setShowOfflineAlert(false)}
                    size="sm"
                    variant="ghost"
                    className="text-red-700"
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Detailed status panel
  if (showDetails) {
    return (
      <div className={`${getPositionClasses()} ${className}`}>
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                {connectionInfo.isOnline ? (
                  <>
                    <Wifi className="w-5 h-5 text-green-600" />
                    <span>Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-5 h-5 text-red-600" />
                    <span>Offline</span>
                  </>
                )}
              </h3>
              
              <Badge 
                variant={connectionInfo.isOnline ? "default" : "destructive"}
                className="flex items-center gap-1"
              >
                {connectionInfo.isOnline ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                {connectionInfo.isOnline ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>

            {connectionInfo.isOnline && (
              <div className="space-y-3">
                {connectionInfo.effectiveType && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Connection Quality:</span>
                    <Badge className={getQualityColor()}>
                      {connectionInfo.effectiveType.toUpperCase()}
                    </Badge>
                  </div>
                )}

                {connectionInfo.connectionType && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Connection Type:</span>
                    <span className="text-sm font-medium">{connectionInfo.connectionType}</span>
                  </div>
                )}

                {connectionInfo.downlink && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Download Speed:</span>
                    <span className="text-sm font-medium">{connectionInfo.downlink} Mbps</span>
                  </div>
                )}

                {connectionInfo.rtt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Latency:</span>
                    <span className="text-sm font-medium">{connectionInfo.rtt} ms</span>
                  </div>
                )}

                {connectionInfo.saveData !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Data Saver:</span>
                    <Badge variant={connectionInfo.saveData ? "destructive" : "default"}>
                      {connectionInfo.saveData ? 'On' : 'Off'}
                    </Badge>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Last checked: {connectionInfo.lastChecked.toLocaleString()}
                </span>
                {!connectionInfo.isOnline && (
                  <Button 
                    onClick={handleManualReconnect}
                    disabled={isReconnecting}
                    size="sm"
                    variant="outline"
                  >
                    {isReconnecting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}