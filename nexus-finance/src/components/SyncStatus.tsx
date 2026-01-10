'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle, 
  AlertCircle, 
  Wifi, 
  WifiOff, 
  Clock, 
  Database,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  Info,
  XCircle
} from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'pending' | 'conflict';
type DataSource = 'server' | 'local' | 'mixed';

interface SyncInfo {
  status: SyncStatus;
  dataSource: DataSource;
  lastSync: Date | null;
  pendingChanges: number;
  conflictedItems: number;
  syncProgress: number;
  isOnline: boolean;
  storageType: 'indexeddb' | 'localstorage' | 'none';
  totalItems: {
    tabungan: number;
    transaksi: number;
  };
  queuedActions: QueuedAction[];
}

interface QueuedAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: 'tabungan' | 'transaksi';
  data: any;
  timestamp: Date;
  retryCount: number;
}

interface SyncStatusProps {
  className?: string;
  showDetails?: boolean;
  variant?: 'compact' | 'default' | 'detailed';
  position?: 'static' | 'floating';
  autoSync?: boolean;
  onSync?: () => Promise<void>;
  onResolveConflict?: (conflicts: any[]) => Promise<void>;
}

export default function SyncStatus({
  className = '',
  showDetails = false,
  variant = 'default',
  position = 'static',
  autoSync = true,
  onSync,
  onResolveConflict
}: SyncStatusProps) {
  const { isOnline } = usePWA();
  const { 
    tabungan, 
    transaksi, 
    lastSync, 
    error: storageError, 
    storageType 
  } = useLocalStorage({
    userId: 'sync-user', // Using sync user ID for demo
    autoSave: true,
    autoLoad: true
  });

  const [syncInfo, setSyncInfo] = useState<SyncInfo>({
    status: 'synced',
    dataSource: 'server',
    lastSync: null,
    pendingChanges: 0,
    conflictedItems: 0,
    syncProgress: 0,
    isOnline: true,
    storageType: 'none',
    totalItems: {
      tabungan: 0,
      transaksi: 0
    },
    queuedActions: []
  });

  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Update sync info based on online status and storage data
  useEffect(() => {
    const updateSyncInfo = () => {
      const isCurrentlyOnline = isOnline;
      const hasLocalData = tabungan.length > 0 || transaksi.length > 0;
      const hasStorageError = !!storageError;
      const hasPendingChanges = 0; // Will be implemented in Phase 2-B

      let newStatus: SyncStatus = 'synced';
      let newDataSource: DataSource = 'server';

      if (!isCurrentlyOnline) {
        newStatus = hasLocalData ? 'offline' : 'offline';
        newDataSource = hasLocalData ? 'local' : 'server';
      } else if (hasStorageError) {
        newStatus = 'error';
        newDataSource = 'local';
      } else if (hasPendingChanges > 0) {
        newStatus = 'pending';
        newDataSource = 'mixed';
      } else if (hasLocalData) {
        newStatus = 'synced';
        newDataSource = 'mixed';
      }

      setSyncInfo(prev => ({
        ...prev,
        status: newStatus,
        dataSource: newDataSource,
        isOnline: isCurrentlyOnline,
        storageType: storageType as 'indexeddb' | 'localstorage' | 'none',
        totalItems: {
          tabungan: tabungan.length,
          transaksi: transaksi.length
        },
        pendingChanges: hasPendingChanges,
        lastSync: lastSync ? new Date(lastSync) : prev.lastSync
      }));
    };

    updateSyncInfo();

    // Set up periodic sync check
    if (autoSync && isOnline) {
      const interval = setInterval(updateSyncInfo, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isOnline, tabungan, transaksi, lastSync, storageType, storageError, autoSync]);

  // Manual sync function
  const handleManualSync = async () => {
    setIsManualSyncing(true);
    setSyncInfo(prev => ({ ...prev, status: 'syncing', syncProgress: 0 }));

    try {
      // Simulate sync progress
      const progressInterval = setInterval(() => {
        setSyncInfo(prev => ({
          ...prev,
          syncProgress: Math.min(prev.syncProgress + 20, 90)
        }));
      }, 500);

      await onSync?.();

      clearInterval(progressInterval);
      setSyncInfo(prev => ({
        ...prev,
        status: 'synced',
        syncProgress: 100,
        lastSync: new Date(),
        pendingChanges: 0
      }));

      // Reset progress after success
      setTimeout(() => {
        setSyncInfo(prev => ({ ...prev, syncProgress: 0 }));
      }, 2000);

    } catch (error) {
      console.error('Sync failed:', error);
      setSyncInfo(prev => ({
        ...prev,
        status: 'error',
        syncProgress: 0
      }));
    } finally {
      setIsManualSyncing(false);
    }
  };

  const getStatusIcon = () => {
    switch (syncInfo.status) {
      case 'synced':
        return <CheckCircle className="w-4 h-4" />;
      case 'syncing':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'offline':
        return <WifiOff className="w-4 h-4" />;
      case 'error':
        return <XCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'conflict':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <RefreshCw className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    switch (syncInfo.status) {
      case 'synced':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'syncing':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'offline':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'conflict':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getDataSourceIcon = () => {
    switch (syncInfo.dataSource) {
      case 'server':
        return <Cloud className="w-4 h-4" />;
      case 'local':
        return <Database className="w-4 h-4" />;
      case 'mixed':
        return <CloudOff className="w-4 h-4" />;
      default:
        return <Database className="w-4 h-4" />;
    }
  };

  const getDataSourceColor = () => {
    switch (syncInfo.dataSource) {
      case 'server':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'local':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'mixed':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = () => {
    switch (syncInfo.status) {
      case 'synced':
        return 'Synced';
      case 'syncing':
        return 'Syncing...';
      case 'offline':
        return 'Offline';
      case 'error':
        return 'Sync Error';
      case 'pending':
        return 'Pending Sync';
      case 'conflict':
        return 'Conflict';
      default:
        return 'Unknown';
    }
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Compact version
  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-2 ${className}`}>
              <Badge className={`${getStatusColor()} flex items-center gap-1`}>
                {getStatusIcon()}
                <span className="text-xs font-medium">{getStatusText()}</span>
              </Badge>
              
              {syncInfo.pendingChanges > 0 && (
                <Badge variant="outline" className="text-xs">
                  {syncInfo.pendingChanges} pending
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <div>Status: {getStatusText()}</div>
              <div>Data Source: {syncInfo.dataSource}</div>
              <div>Last Sync: {formatLastSync(syncInfo.lastSync)}</div>
              {syncInfo.pendingChanges > 0 && (
                <div>Pending: {syncInfo.pendingChanges} changes</div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Default version
  if (variant === 'default') {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={`${getStatusColor()} flex items-center gap-1`}>
                {getStatusIcon()}
                <span className="text-xs">{getStatusText()}</span>
              </Badge>
              
              <Badge className={`${getDataSourceColor()} flex items-center gap-1`}>
                {getDataSourceIcon()}
                <span className="text-xs">{syncInfo.dataSource.toUpperCase()}</span>
              </Badge>

              {syncInfo.pendingChanges > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {syncInfo.pendingChanges} pending
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {formatLastSync(syncInfo.lastSync)}
              </span>
              
              {(syncInfo.status === 'pending' || syncInfo.status === 'error') && (
                <Button
                  onClick={handleManualSync}
                  disabled={isManualSyncing || !syncInfo.isOnline}
                  size="sm"
                  variant="outline"
                >
                  {isManualSyncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {syncInfo.syncProgress > 0 && (
            <div className="mt-3">
              <Progress value={syncInfo.syncProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Detailed version
  if (variant === 'detailed' && showDetails) {
    return (
      <Card className={`${className} shadow-lg`}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Sync Status
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Main Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Sync Status</h4>
              <Badge className={`${getStatusColor()} flex items-center gap-2 px-3 py-2`}>
                {getStatusIcon()}
                <div className="text-left">
                  <div className="font-medium">{getStatusText()}</div>
                  <div className="text-xs opacity-75">
                    {syncInfo.isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>
              </Badge>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Data Source</h4>
              <Badge className={`${getDataSourceColor()} flex items-center gap-2 px-3 py-2`}>
                {getDataSourceIcon()}
                <div className="text-left">
                  <div className="font-medium">{syncInfo.dataSource.toUpperCase()}</div>
                  <div className="text-xs opacity-75">
                    {syncInfo.storageType.toUpperCase()}
                  </div>
                </div>
              </Badge>
            </div>
          </div>

          {/* Sync Progress */}
          {syncInfo.syncProgress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">Sync Progress</h4>
                <span className="text-sm text-gray-600">{syncInfo.syncProgress}%</span>
              </div>
              <Progress value={syncInfo.syncProgress} className="h-3" />
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Local Data</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tabungan:</span>
                  <span className="font-medium">{syncInfo.totalItems.tabungan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaksi:</span>
                  <span className="font-medium">{syncInfo.totalItems.transaksi}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Sync Info</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Sync:</span>
                  <span className="font-medium">{formatLastSync(syncInfo.lastSync)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending:</span>
                  <span className="font-medium">{syncInfo.pendingChanges}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleManualSync}
              disabled={isManualSyncing || !syncInfo.isOnline}
              className="flex-1"
            >
              {isManualSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>

            {syncInfo.conflictedItems > 0 && onResolveConflict && (
              <Button
                onClick={() => onResolveConflict([])}
                variant="outline"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Resolve ({syncInfo.conflictedItems})
              </Button>
            )}
          </div>

          {/* Status Messages */}
          {!syncInfo.isOnline && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-2">
                <WifiOff className="w-4 h-4 text-orange-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-orange-800">Offline Mode</h5>
                  <p className="text-sm text-orange-700">
                    Changes will be saved locally and synced when you're back online.
                  </p>
                </div>
              </div>
            </div>
          )}

          {syncInfo.status === 'error' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-red-800">Sync Error</h5>
                  <p className="text-sm text-red-700">
                    Last sync failed. Please check your connection and try again.
                  </p>
                </div>
              </div>
            </div>
          )}

          {syncInfo.pendingChanges > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-yellow-800">Pending Changes</h5>
                  <p className="text-sm text-yellow-700">
                    {syncInfo.pendingChanges} changes will be synced when online.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}