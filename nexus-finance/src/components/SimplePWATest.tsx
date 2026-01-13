'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePWA } from '@/hooks/usePWA';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useCacheSync } from '@/hooks/use-cache-sync';
import { useOfflineQueue, useOfflineQueueMonitor } from '@/hooks/use-offline-queue';
import { useCacheWarming, useCacheWarmingMonitor } from '@/hooks/use-cache-warming';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import OfflineIndicator from '@/components/OfflineIndicator';
import PlatformBadge from '@/components/PlatformBadge';
import SyncStatus from '@/components/SyncStatus';
import { CacheInvalidationDashboard } from '@/components/CacheInvalidation';
import { CacheAnalyticsDashboard, CacheAnalyticsStatus } from '@/components/CacheAnalytics';
import { CacheSyncDashboard } from '@/components/CacheSync';
import { OfflineQueueDashboard } from '@/components/OfflineQueue';
import { CacheWarmingDashboard } from '@/components/CacheWarmingDashboard';
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
  RefreshCw,
  Zap,
  Trash2,
  Activity,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Target,
  Settings,
  RotateCcw,
  Layers,
  Radio,
  Router,
  Server,
  Cloud,
  CloudOff,
  Users,
  Shield,
  Cpu,
  HardDrive,
  Network,
  Power,
  PowerOff,
  Brain
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

  const {
    isSyncing,
    metrics,
    pendingOperations,
    conflicts,
    forceSync,
    getSyncStatistics
  } = useCacheSync({
    autoStart: true,
    enableRealTimeUpdates: true,
    onSyncStart: () => console.log('🔄 Sync started'),
    onSyncComplete: (duration) => console.log(`✅ Sync completed in ${duration}ms`)
  });

  // Offline Queue Management - Step 2.7
  const {
    isOnline: isQueueOnline,
    metrics: queueMetrics,
    pendingRequests,
    failedRequests,
    config: queueConfig,
    lastUpdate: queueLastUpdate,
    error: queueError,
    addRequest,
    cancelRequest,
    retryFailedRequests,
    clearCompletedRequests,
    clearAllRequests,
    updateConfig,
    refreshData,
    getRequestsByPriority,
    getRequestsByResource,
    getQueueStatistics
  } = useOfflineQueue({
    autoStart: true,
    enableRealTimeUpdates: true,
    onRequestAdded: (request) => console.log('📝 Request added to queue:', request.id),
    onRequestCompleted: (request) => console.log('✅ Request completed:', request.id),
    onRequestFailed: (request) => console.log('❌ Request failed:', request.id),
    onOnline: () => console.log('🌐 Queue online - processing requests'),
    onOffline: () => console.log('📴 Queue offline - requests will be queued')
  });

  const {
    metrics: queueMonitorMetrics,
    alerts: queueAlerts,
    clearAlerts
  } = useOfflineQueueMonitor();

  // Cache Warming Management - Step 2.8
  const {
    isRunning: isWarmingRunning,
    metrics: warmingMetrics,
    queueStatus: warmingQueueStatus,
    recommendations: warmingRecommendations,
    popularContent,
    prioritizedResources,
    behaviorMetrics: warmingBehaviorMetrics,
    startWarming,
    stopWarming,
    addWarmingTask,
    addBehaviorBasedTasks,
    addPopularContentTasks,
    refreshData: refreshWarmingData
  } = useCacheWarming({
    autoStart: true,
    enableRealTimeUpdates: true,
    userId: 'test-user',
    onWarmingStarted: () => console.log('🔥 Cache warming started'),
    onWarmingStopped: () => console.log('❄️ Cache warming stopped')
  });

  const {
    alerts: warmingAlerts,
    clearAlerts: clearWarmingAlerts
  } = useCacheWarmingMonitor();

  const [activeTab, setActiveTab] = useState('overview');
  const [showComponents, setShowComponents] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showWarming, setShowWarming] = useState(false);

  // Helper functions for queue testing
  const addTestRequest = async (type: 'financial' | 'cache' | 'analytics' = 'financial') => {
    const testUrls = {
      financial: '/api/transactions',
      cache: '/api/cache/sync',
      analytics: '/api/analytics/track'
    };

    try {
      await addRequest(testUrls[type], 'POST', {
        test: true,
        timestamp: Date.now(),
        type
      }, type === 'financial' ? 'critical' : type === 'cache' ? 'high' : 'medium', {
        resource: type,
        operation: 'test'
      });
    } catch (error) {
      console.error('Failed to add test request:', error);
    }
  };

  const queueStats = getQueueStatistics();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🧪 PWA Cache Management Test Suite</h1>
          <p className="text-gray-600">Phase 2-D: Advanced Cache Features - Step 2.8: Intelligent Cache Warming</p>
          <div className="flex justify-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">Phase 1: PWA Foundation</Badge>
            <Badge variant="outline" className="text-xs">Phase 2-A: UI Components</Badge>
            <Badge variant="outline" className="text-xs">Phase 2-B: Local Storage</Badge>
            <Badge variant="outline" className="text-xs">Phase 2-C: Advanced Cache</Badge>
            <Badge variant="default" className="text-xs">Phase 2-D: Complete System</Badge>
          </div>
        </div>

        {/* Main Status Overview - 6 Status Indicators */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Complete PWA Cache Management Status
            </CardTitle>
            <CardDescription>
              Current PWA, synchronization, queue, warming, analytics, and connection system status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xl mb-1">
                  {isPWA ? <Smartphone className="w-6 h-6 text-green-600 mx-auto" /> : <Globe className="w-6 h-6 text-blue-600 mx-auto" />}
                </div>
                <div className="font-semibold text-sm">PWA Mode</div>
                <Badge variant={isPWA ? "default" : "secondary"} className="mt-1 text-xs">
                  {isPWA ? 'ACTIVE' : 'WEB'}
                </Badge>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xl mb-1">
                  <RefreshCw className={`w-6 h-6 text-purple-600 mx-auto ${isSyncing ? 'animate-spin' : ''}`} />
                </div>
                <div className="font-semibold text-sm">Sync System</div>
                <Badge variant={isSyncing ? "default" : "secondary"} className="mt-1 text-xs">
                  {isSyncing ? 'SYNCING' : 'READY'}
                </Badge>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xl mb-1">
                  <Layers className={`w-6 h-6 text-orange-600 mx-auto ${queueMetrics.queueSize > 0 ? 'animate-pulse' : ''}`} />
                </div>
                <div className="font-semibold text-sm">Queue System</div>
                <Badge variant={queueMetrics.queueSize > 0 ? "default" : "secondary"} className="mt-1 text-xs">
                  {queueMetrics.queueSize > 0 ? `${queueMetrics.queueSize} PENDING` : 'EMPTY'}
                </Badge>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xl mb-1">
                  <Brain className={`w-6 h-6 text-pink-600 mx-auto ${isWarmingRunning ? 'animate-pulse' : ''}`} />
                </div>
                <div className="font-semibold text-sm">Cache Warming</div>
                <Badge variant={isWarmingRunning ? "default" : "secondary"} className="mt-1 text-xs">
                  {isWarmingRunning ? 'ACTIVE' : 'IDLE'}
                </Badge>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xl mb-1">
                  <BarChart3 className="w-6 h-6 text-blue-600 mx-auto" />
                </div>
                <div className="font-semibold text-sm">Analytics</div>
                <Badge variant="default" className="mt-1 text-xs">
                  MONITORING
                </Badge>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xl mb-1">
                  {isOnline ? <Wifi className="w-6 h-6 text-green-600 mx-auto" /> : <WifiOff className="w-6 h-6 text-red-600 mx-auto" />}
                </div>
                <div className="font-semibold text-sm">Connection</div>
                <Badge variant={isOnline ? "default" : "destructive"} className="mt-1 text-xs">
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comprehensive System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Complete System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* PWA & Platform Information */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700 mb-2">PWA & Platform</h4>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Platform:</span>
                  <Badge variant="outline" className="text-xs">{platform.toUpperCase()}</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Browser:</span>
                  <Badge variant="outline" className="text-xs">{browser.toUpperCase()}</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">PWA Status:</span>
                  <Badge variant={isPWA ? "default" : "secondary"} className="text-xs">
                    {isPWA ? 'INSTALLED' : 'WEB APP'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Standalone:</span>
                  <Badge variant={isStandalone ? "default" : "secondary"} className="text-xs">
                    {isStandalone ? 'YES' : 'NO'}
                  </Badge>
                </div>
              </div>
              
              {/* Storage & Cache Information */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700 mb-2">Storage & Cache</h4>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Storage Type:</span>
                  <Badge variant="outline" className="text-xs">{storageType.toUpperCase()}</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Local Data:</span>
                  <Badge variant="outline" className="text-xs">
                    {tabungan.length + transaksi.length} items
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Cache Strategy:</span>
                  <Badge variant="outline" className="text-xs">NETWORK-FIRST</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Last Sync:</span>
                  <Badge variant="outline" className="text-xs">
                    {lastSync ? new Date(lastSync).toLocaleTimeString() : 'Never'}
                  </Badge>
                </div>
              </div>
              
              {/* Queue & Sync Information */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700 mb-2">Queue & Sync</h4>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Queue Size:</span>
                  <Badge variant="outline" className="text-xs">{queueMetrics.queueSize}</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Pending Ops:</span>
                  <Badge variant="outline" className="text-xs">{pendingOperations.length}</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Failed Requests:</span>
                  <Badge variant="outline" className="text-xs">{failedRequests.length}</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Warming Tasks:</span>
                  <Badge variant="outline" className="text-xs">{warmingMetrics.totalTasks}</Badge>
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

        {/* Advanced Cache Management Testing - 6 Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Phase 2-D: Complete Advanced Cache Features Testing
            </CardTitle>
            <CardDescription>
              Test cache synchronization, queue management, warming, invalidation strategies, and performance analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="warming" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="warming">Warming</TabsTrigger>
                <TabsTrigger value="queue">Queue</TabsTrigger>
                <TabsTrigger value="synchronization">Sync</TabsTrigger>
                <TabsTrigger value="invalidation">Invalidation</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="status">Status</TabsTrigger>
              </TabsList>
              
              <TabsContent value="warming" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Button
                    onClick={() => setShowWarming(!showWarming)}
                    variant="outline"
                    className="w-full"
                  >
                    {showWarming ? 'Hide' : 'Show'} Cache Warming Dashboard
                  </Button>
                  <Button
                    onClick={() => addBehaviorBasedTasks()}
                    variant="outline"
                    className="w-full"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Add Behavior Tasks
                  </Button>
                  <Button
                    onClick={() => addPopularContentTasks()}
                    variant="outline"
                    className="w-full"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Add Popular Content
                  </Button>
                </div>
                {showWarming && (
                  <div className="mt-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                    <div className="flex items-center gap-2 text-pink-800">
                      <Brain className="w-4 h-4" />
                      <span className="text-sm font-medium">Cache Warming Dashboard Active</span>
                    </div>
                    <p className="text-xs text-pink-700 mt-1">
                      AI-powered cache warming with behavior analysis, predictive preloading, and intelligent prioritization
                    </p>
                    <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                      <div className="text-pink-700">
                        <strong>Total Tasks:</strong> {warmingMetrics.totalTasks}
                      </div>
                      <div className="text-pink-700">
                        <strong>Efficiency:</strong> {warmingMetrics.warmingEfficiency.toFixed(1)}%
                      </div>
                      <div className="text-pink-700">
                        <strong>Data Loaded:</strong> {(warmingMetrics.totalDataLoaded / 1024 / 1024).toFixed(1)}MB
                      </div>
                      <div className="text-pink-700">
                        <strong>Recommendations:</strong> {warmingRecommendations.length}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="queue" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Button
                    onClick={() => setShowQueue(!showQueue)}
                    variant="outline"
                    className="w-full"
                  >
                    {showQueue ? 'Hide' : 'Show'} Queue Dashboard
                  </Button>
                  <Button
                    onClick={() => addTestRequest('financial')}
                    variant="outline"
                    className="w-full"
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    Add Financial Request
                  </Button>
                  <Button
                    onClick={retryFailedRequests}
                    disabled={failedRequests.length === 0}
                    variant="outline"
                    className="w-full"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retry Failed ({failedRequests.length})
                  </Button>
                </div>
                {showQueue && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-800">
                      <Layers className="w-4 h-4" />
                      <span className="text-sm font-medium">Queue Dashboard Active</span>
                    </div>
                    <p className="text-xs text-orange-700 mt-1">
                      Advanced offline queue with prioritization, batch processing, retry logic, and persistence
                    </p>
                    <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                      <div className="text-orange-700">
                        <strong>Queue Size:</strong> {queueMetrics.queueSize}
                      </div>
                      <div className="text-orange-700">
                        <strong>Pending:</strong> {queueMetrics.pendingRequests}
                      </div>
                      <div className="text-orange-700">
                        <strong>Failed:</strong> {queueMetrics.failedRequests}
                      </div>
                      <div className="text-orange-700">
                        <strong>Success Rate:</strong> {Math.round(queueMetrics.successRate)}%
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="synchronization" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Button
                    onClick={() => setShowSync(!showSync)}
                    variant="outline"
                    className="w-full"
                  >
                    {showSync ? 'Hide' : 'Show'} Sync Dashboard
                  </Button>
                  <Button
                    onClick={forceSync}
                    disabled={isSyncing}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Force Sync Now'}
                  </Button>
                </div>
                {showSync && (
                  <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 text-purple-800">
                      <RefreshCw className="w-4 h-4" />
                      <span className="text-sm font-medium">Synchronization Dashboard Active</span>
                    </div>
                    <p className="text-xs text-purple-700 mt-1">
                      Advanced sync with conflict resolution, delta synchronization, and background processing
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div className="text-purple-700">
                        <strong>Operations:</strong> {pendingOperations.length}
                      </div>
                      <div className="text-purple-700">
                        <strong>Conflicts:</strong> {conflicts.length}
                      </div>
                      <div className="text-purple-700">
                        <strong>Success Rate:</strong> {metrics.totalOperations > 0 ? Math.round((metrics.successfulSyncs / metrics.totalOperations) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="invalidation" className="space-y-4">
                <Button
                  onClick={() => setShowComponents(!showComponents)}
                  variant="outline"
                  className="w-full"
                >
                  {showComponents ? 'Hide' : 'Show'} Cache Invalidation Dashboard
                </Button>
                {showComponents && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Target className="w-4 h-4" />
                      <span className="text-sm font-medium">Invalidation Dashboard Active</span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      Rule-based cache invalidation with pattern matching, tags, and event-driven clearing
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="analytics" className="space-y-4">
                <Button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  variant="outline"
                  className="w-full"
                >
                  {showAnalytics ? 'Hide' : 'Show'} Cache Analytics Dashboard
                </Button>
                {showAnalytics && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <BarChart3 className="w-4 h-4" />
                      <span className="text-sm font-medium">Analytics Dashboard Active</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Real-time performance monitoring, hit rate tracking, and optimization recommendations
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="status" className="space-y-4">
                <CacheAnalyticsStatus />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Queue Alerts & Status */}
        {queueAlerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="w-5 h-5" />
                Queue System Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {queueAlerts.map((alert, index) => (
                  <div key={index} className={`p-3 rounded-lg text-sm ${
                    alert.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                    alert.type === 'warning' ? 'bg-orange-50 text-orange-800 border border-orange-200' :
                    'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span>{alert.message}</span>
                      <Badge variant="outline" className="text-xs">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </Badge>
                    </div>
                  </div>
                ))}
                <Button onClick={clearAlerts} size="sm" variant="outline" className="mt-2">
                  Clear Alerts
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cache Warming Alerts */}
        {warmingAlerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-pink-600">
                <Brain className="w-5 h-5" />
                Cache Warming Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {warmingAlerts.slice(0, 3).map((alert, index) => (
                  <div key={index} className={`p-3 rounded-lg text-sm ${
                    alert.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                    alert.type === 'warning' ? 'bg-orange-50 text-orange-800 border border-orange-200' :
                    alert.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                    'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span>{alert.message}</span>
                      <Badge variant="outline" className="text-xs">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </Badge>
                    </div>
                  </div>
                ))}
                <Button onClick={clearWarmingAlerts} size="sm" variant="outline" className="mt-2">
                  Clear Warming Alerts
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sync Status Alerts */}
        {(pendingOperations.length > 0 || conflicts.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingOperations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <Clock className="w-5 h-5" />
                    Pending Sync Operations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{pendingOperations.length}</div>
                    <div className="text-sm text-gray-600">operations waiting to sync</div>
                    <Button 
                      onClick={forceSync} 
                      disabled={isSyncing}
                      size="sm" 
                      className="mt-2"
                    >
                      Process Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {conflicts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                    Sync Conflicts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{conflicts.length}</div>
                    <div className="text-sm text-gray-600">conflicts need resolution</div>
                    <Button 
                      onClick={() => setShowSync(true)} 
                      size="sm" 
                      variant="outline"
                      className="mt-2"
                    >
                      Resolve Conflicts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Dashboard Components */}
        {showWarming && (
          <CacheWarmingDashboard userId="test-user" />
        )}

        {showQueue && (
          <OfflineQueueDashboard />
        )}

        {showSync && (
          <CacheSyncDashboard />
        )}

        {showComponents && (
          <>
            <CacheInvalidationDashboard />
            <div className="mt-6">
              <CacheAnalyticsStatus />
            </div>
          </>
        )}

        {showAnalytics && (
          <CacheAnalyticsDashboard />
        )}

        {/* Comprehensive Performance Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Complete System Performance Statistics
            </CardTitle>
            <CardDescription>
              Real-time metrics for PWA, cache, sync, queue, warming, and analytics systems
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                  <RefreshCw className={`w-8 h-8 text-purple-600 mx-auto ${isSyncing ? 'animate-spin' : ''}`} />
                </div>
                <div className="font-semibold">Sync Status</div>
                <Badge variant={isSyncing ? "default" : "outline"} className="mt-1">
                  {isSyncing ? 'ACTIVE' : 'STANDBY'}
                </Badge>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">
                  <Layers className={`w-8 h-8 text-orange-600 mx-auto ${queueMetrics.queueSize > 0 ? 'animate-pulse' : ''}`} />
                </div>
                <div className="font-semibold">Queue Size</div>
                <Badge variant={queueMetrics.queueSize > 0 ? "default" : "outline"} className="mt-1">
                  {queueMetrics.queueSize}
                </Badge>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">
                  <Brain className={`w-8 h-8 text-pink-600 mx-auto ${isWarmingRunning ? 'animate-pulse' : ''}`} />
                </div>
                <div className="font-semibold">Cache Warming</div>
                <Badge variant={isWarmingRunning ? "default" : "outline"} className="mt-1">
                  {warmingMetrics.warmingEfficiency.toFixed(1)}%
                </Badge>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">
                  <BarChart3 className="w-8 h-8 text-cyan-600 mx-auto" />
                </div>
                <div className="font-semibold">Analytics</div>
                <Badge variant="outline" className="mt-1">
                  {showAnalytics ? 'ACTIVE' : 'STANDBY'}
                </Badge>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">
                  <Target className="w-8 h-8 text-red-600 mx-auto" />
                </div>
                <div className="font-semibold">Invalidation</div>
                <Badge variant="outline" className="mt-1">
                  {showComponents ? 'ACTIVE' : 'STANDBY'}
                </Badge>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">
                  <RefreshCw className="w-8 h-8 text-cyan-600 mx-auto" />
                </div>
                <div className="font-semibold">Last Sync</div>
                <Badge variant="outline" className="mt-1">
                  {lastSync ? 
                    new Date(lastSync).toLocaleTimeString() : 
                    'Never'
                  }
                </Badge>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">
                  <Shield className="w-8 h-8 text-indigo-600 mx-auto" />
                </div>
                <div className="font-semibold">Success Rate</div>
                <Badge variant="outline" className="mt-1">
                  {Math.round(queueMetrics.successRate)}%
                </Badge>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">
                  <HardDrive className="w-8 h-8 text-gray-600 mx-auto" />
                </div>
                <div className="font-semibold">Storage</div>
                <Badge variant="outline" className="mt-1">
                  {storageType}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Complete Implementation Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Complete PWA Cache Management Implementation Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Phase Progress */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-green-600">✅ Phase 1: PWA Foundation</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• PWA detection & capabilities</li>
                    <li>• Install prompt management</li>
                    <li>• Platform & browser detection</li>
                    <li>• Online/offline status</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-600">✅ Phase 2-A/B: UI & Storage</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• PWA UI components</li>
                    <li>• Local storage integration</li>
                    <li>• Financial data management</li>
                    <li>• Real-time synchronization</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-purple-600">✅ Phase 2-C/D: Advanced Features</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Cache analytics & monitoring</li>
                    <li>• Cache invalidation strategies</li>
                    <li>• Advanced sync system</li>
                    <li>• Offline queue management</li>
                    <li>• Intelligent cache warming</li>
                  </ul>
                </div>
              </div>
              
              {/* Step 2.8 Complete Alert */}
              <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
                <div className="flex items-center gap-2 text-pink-800">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">🎉 Step 2.8: Intelligent Cache Warming Complete!</span>
                </div>
                <p className="text-sm text-pink-700 mt-2">
                  Advanced intelligent cache warming system successfully implemented with 
                  AI-powered behavior analysis, predictive preloading, popular content detection, 
                  resource prioritization, and adaptive learning. Enterprise-grade performance optimization!
                </p>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                  <div className="text-pink-700">
                    <strong>Behavior Analysis:</strong> ✅ Active
                  </div>
                  <div className="text-pink-700">
                    <strong>Predictive Preloading:</strong> ✅ Smart
                  </div>
                  <div className="text-pink-700">
                    <strong>Popular Content:</strong> ✅ Detected
                  </div>
                  <div className="text-pink-700">
                    <strong>Resource Priority:</strong> ✅ Optimized
                  </div>
                  <div className="text-pink-700">
                    <strong>Adaptive Learning:</strong> ✅ Enabled
                  </div>
                </div>
              </div>
              
              {/* System Capabilities */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-lg font-semibold text-green-800">PWA Ready</div>
                  <div className="text-sm text-green-600">Installable & Offline</div>
                </div>
                <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-lg font-semibold text-blue-800">Smart Cache</div>
                  <div className="text-sm text-blue-600">Advanced Strategies</div>
                </div>
                <div className="text-center p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="text-lg font-semibold text-purple-800">Real-time Sync</div>
                  <div className="text-sm text-purple-600">Conflict Resolution</div>
                </div>
                <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="text-lg font-semibold text-orange-800">Queue System</div>
                  <div className="text-sm text-orange-600">Offline-first</div>
                </div>
                <div className="text-center p-3 bg-pink-50 border border-pink-200 rounded-lg">
                  <div className="text-lg font-semibold text-pink-800">AI Warming</div>
                  <div className="text-sm text-pink-600">Predictive Cache</div>
                </div>
              </div>
              
              {/* Next Steps */}
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-sm font-medium text-gray-800 mb-2">🎉 Phase 2-D Complete! Ready for Phase 3:</div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>• Phase 3: Production Deployment & Optimization</div>
                  <div>• Bundle size optimization & performance tuning</div>
                  <div>• CI/CD pipeline setup</div>
                  <div>• Enterprise-grade monitoring & analytics</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}