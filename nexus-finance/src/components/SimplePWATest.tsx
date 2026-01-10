'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePWA } from '@/hooks/usePWA';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import OfflineIndicator from '@/components/OfflineIndicator';
import PlatformBadge from '@/components/PlatformBadge';
import SyncStatus from '@/components/SyncStatus';
import { 
  Smartphone, 
  Monitor, 
  Globe, 
  Wifi, 
  WifiOff, 
  Download,
  Info,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  RefreshCw
} from 'lucide-react';

export default function SimplePWATest() {
  const {
    isPWA,
    isInstallable,
    isStandalone,
    isOnline, // Variabel ini yang digunakan di UI
    platform,
    browser,
    canInstall,
    installPWA,
    dismissInstallPrompt
  } = usePWA();

  const { 
    tabungan, 
    transaksi, 
    lastSync, 
    isLoading: storageLoading, 
    error: storageError, 
    isOnline: isStorageOnline, // Diberi alias agar tidak bentrok
    storageType 
  } = useLocalStorage({
    userId: 'test-user', // Using test user ID for demo
    autoSave: true,
    autoLoad: true
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [showComponents, setShowComponents] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🧪 PWA Complete Test Suite</h1>
          <p className="text-gray-600">Phase 2-A: PWA UI Components Testing</p>
        </div>

        {/* Main Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              PWA Status Overview
            </CardTitle>
            <CardDescription>
              Current PWA detection and platform information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">
                  {isPWA ? <Smartphone className="w-8 h-8 text-green-600 mx-auto" /> : <Globe className="w-8 h-8 text-blue-600 mx-auto" />}
                </div>
                <div className="font-semibold">PWA Mode</div>
                <Badge variant={isPWA ? "default" : "secondary"} className="mt-1">
                  {isPWA ? 'ACTIVE' : 'WEB'}
                </Badge>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">
                  <Monitor className={`w-8 h-8 mx-auto ${isStandalone ? 'text-green-600' : 'text-blue-600'}`} />
                </div>
                <div className="font-semibold">Display Mode</div>
                <Badge variant={isStandalone ? "default" : "secondary"} className="mt-1">
                  {isStandalone ? 'STANDALONE' : 'BROWSER'}
                </Badge>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">
                  {canInstall ? <Download className="w-8 h-8 text-green-600 mx-auto" /> : <AlertCircle className="w-8 h-8 text-orange-600 mx-auto" />}
                </div>
                <div className="font-semibold">Installable</div>
                <Badge variant={canInstall ? "default" : "secondary"} className="mt-1">
                  {canInstall ? 'YES' : 'NO'}
                </Badge>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">
                  {isOnline ? <Wifi className="w-8 h-8 text-green-600 mx-auto" /> : <WifiOff className="w-8 h-8 text-red-600 mx-auto" />}
                </div>
                <div className="font-semibold">Connection</div>
                <Badge variant={isOnline ? "default" : "destructive"} className="mt-1">
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Platform & Browser Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Platform:</span>
                  <Badge variant="outline">{platform.toUpperCase()}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Browser:</span>
                  <Badge variant="outline">{browser.toUpperCase()}</Badge>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Storage Type:</span>
                  <Badge variant="outline">{storageType.toUpperCase()}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Local Data:</span>
                  <Badge variant="outline">
                    {tabungan.length + transaksi.length} items
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Install Section */}
        {canInstall && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Install PWA
              </CardTitle>
              <CardDescription>
                Install this app as a standalone application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={installPWA}
                  className="flex-1"
                  size="lg"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Install Application
                </Button>
                <Button
                  onClick={dismissInstallPrompt}
                  variant="outline"
                  size="lg"
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PWA Components Testing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Phase 2-A: PWA Components Testing
            </CardTitle>
            <CardDescription>
              Test all PWA UI components that have been created
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setShowComponents(!showComponents)}
              variant="outline"
              className="w-full"
            >
              {showComponents ? 'Hide' : 'Show'} PWA Components
            </Button>
          </CardContent>
        </Card>

        {/* PWA Components Demo */}
        {showComponents && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📱 PWA Install Prompt</CardTitle>
                <CardDescription>
                  Advanced install prompt with multiple display options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Floating Version</h4>
                    <PWAInstallPrompt position="floating" autoHide={false} />
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Bottom Version</h4>
                    <PWAInstallPrompt position="bottom" autoHide={false} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📶 Offline Indicator</CardTitle>
                <CardDescription>
                  Real-time connection status and monitoring
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Compact Badge</h4>
                    <OfflineIndicator position="floating" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Default Card</h4>
                    <OfflineIndicator showDetails={false} position="bottom" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Detailed View</h4>
                    <OfflineIndicator showDetails={true} position="floating" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🖥️ Platform Badge</CardTitle>
                <CardDescription>
                  Platform and browser information display
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Compact Version</h4>
                  <PlatformBadge variant="compact" />
                </div>
                <div>
                  <h4 className="font-medium mb-2">Default Version</h4>
                  <PlatformBadge variant="default" />
                </div>
                <div>
                  <h4 className="font-medium mb-2">Detailed Version</h4>
                  <PlatformBadge variant="detailed" showDetails={true} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🔄 Sync Status</CardTitle>
                <CardDescription>
                  Data synchronization status and progress monitoring
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Compact Version</h4>
                  <SyncStatus variant="compact" />
                </div>
                <div>
                  <h4 className="font-medium mb-2">Default Version</h4>
                  <SyncStatus variant="default" />
                </div>
                <div>
                  <h4 className="font-medium mb-2">Detailed Version</h4>
                  <SyncStatus variant="detailed" showDetails={true} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Storage Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Local Storage Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">
                  <Database className="w-8 h-8 text-blue-600 mx-auto" />
                </div>
                <div className="font-semibold">Tabungan</div>
                <Badge variant="outline" className="mt-1">
                  {tabungan.length} items
                </Badge>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">
                  <Clock className="w-8 h-8 text-green-600 mx-auto" />
                </div>
                <div className="font-semibold">Transaksi</div>
                <Badge variant="outline" className="mt-1">
                  {transaksi.length} items
                </Badge>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">
                  <RefreshCw className="w-8 h-8 text-purple-600 mx-auto" />
                </div>
                <div className="font-semibold">Last Sync</div>
                <Badge variant="outline" className="mt-1">
                  {lastSync ? 
                    new Date(lastSync).toLocaleTimeString() : 
                    'Never'
                  }
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Phase 2-A Progress Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">✅ Completed Components</h4>
                  <ul className="space-y-1 text-sm text-green-600">
                    <li>• PWAInstallPrompt.tsx</li>
                    <li>• OfflineIndicator.tsx</li>
                    <li>• PlatformBadge.tsx</li>
                    <li>• SyncStatus.tsx</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">📋 Next Steps</h4>
                  <ul className="space-y-1 text-sm text-blue-600">
                    <li>• Phase 2-B: Local Storage Integration</li>
                    <li>• Update financial context</li>
                    <li>• Implement dual data source</li>
                    <li>• Add auto-sync mechanism</li>
                  </ul>
                </div>
              </div>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Phase 2-A Complete! 🎉</span>
                </div>
                <p className="text-sm text-green-700 mt-2">
                  All PWA UI components have been successfully created and tested. 
                  Ready to proceed with Phase 2-B: Local Storage Integration.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}