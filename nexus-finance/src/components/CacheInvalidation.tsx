/**
 * Cache Invalidation UI Components
 * 
 * UI components for cache invalidation management and monitoring.
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  useCacheInvalidation,
  useAutoCacheInvalidation,
  useCacheInvalidationMonitor,
  type CacheInvalidationResult
} from '@/hooks/use-cache-invalidation';
import { 
  Trash2, 
  RefreshCw, 
  Clock, 
  Tag, 
  AlertCircle, 
  CheckCircle, 
  Activity,
  Zap,
  Database,
  Calendar,
  TrendingUp
} from 'lucide-react';

interface CacheInvalidationDashboardProps {
  className?: string;
}

export function CacheInvalidationDashboard({ className }: CacheInvalidationDashboardProps) {
  const {
    isInvalidating,
    lastInvalidation,
    invalidationHistory,
    stats,
    invalidateByPattern,
    invalidateByTags,
    invalidateByEvent,
    invalidateByVersion,
    invalidateFinancial,
    invalidateUser,
    triggerLogoutInvalidation,
    invalidateTransaction,
    invalidateAssets,
    invalidateAPI,
    updateAPI,
    updateAssets,
    clearHistory,
    refreshStats
  } = useCacheInvalidation({
    onInvalidationComplete: (result) => {
      console.log('Invalidation completed:', result);
    }
  });

  const { isOnline, lastUserActivity } = useAutoCacheInvalidation();
  const { logs, clearLogs } = useCacheInvalidationMonitor();

  const [customPattern, setCustomPattern] = useState('');
  const [customTags, setCustomTags] = useState('');
  const [customEvent, setCustomEvent] = useState('');
  const [versionKey, setVersionKey] = useState('');
  const [newVersion, setNewVersion] = useState('');

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getInvalidationStatusColor = (result: CacheInvalidationResult) => {
    if (result.success) return 'text-green-600';
    if (result.errors.length > 0) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getInvalidationStatusIcon = (result: CacheInvalidationResult) => {
    if (result.success) return <CheckCircle className="h-4 w-4" />;
    if (result.errors.length > 0) return <AlertCircle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  return (
    <div className={className}>
      <div className="grid gap-6">
        {/* Status Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isInvalidating ? 'Invalidating...' : 'Ready'}
              </div>
              <p className="text-xs text-muted-foreground">
                {isOnline ? 'Online' : 'Offline'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invalidations</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalInvalidations || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.successfulInvalidations || 0} successful
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.rulesCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.eventListenersCount || 0} listeners
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lastUserActivity ? formatTimestamp(lastUserActivity) : 'Never'}
              </div>
              <p className="text-xs text-muted-foreground">
                User activity
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Control Panel */}
        <Tabs defaultValue="presets" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="presets">Quick Actions</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Invalidation Actions</CardTitle>
                <CardDescription>
                  Common cache invalidation scenarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Button
                    onClick={() => invalidateFinancial()}
                    disabled={isInvalidating}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Invalidate Financial Data
                  </Button>

                  <Button
                    onClick={() => invalidateUser()}
                    disabled={isInvalidating}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Invalidate User Data
                  </Button>

                  <Button
                    onClick={() => triggerLogoutInvalidation()}
                    disabled={isInvalidating}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Invalidate on Logout
                  </Button>

                  <Button
                    onClick={() => invalidateAssets()}
                    disabled={isInvalidating}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Invalidate Assets
                  </Button>

                  <Button
                    onClick={() => invalidateAPI()}
                    disabled={isInvalidating}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Invalidate API
                  </Button>

                  <Button
                    onClick={() => {
                      invalidateTransaction({ id: Date.now(), type: 'test' });
                    }}
                    disabled={isInvalidating}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Test Transaction
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Pattern-based Invalidation</CardTitle>
                  <CardDescription>
                    Invalidate cache entries matching a pattern
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <input
                    type="text"
                    placeholder="Pattern (e.g., api- or /^api-/)"
                    value={customPattern}
                    onChange={(e) => setCustomPattern(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                  <Button
                    onClick={() => {
                      if (customPattern) {
                        const pattern = customPattern.startsWith('/') 
                          ? new RegExp(customPattern.slice(1, -1))
                          : customPattern;
                        invalidateByPattern(pattern);
                      }
                    }}
                    disabled={isInvalidating || !customPattern}
                    className="w-full"
                  >
                    Invalidate by Pattern
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tag-based Invalidation</CardTitle>
                  <CardDescription>
                    Invalidate cache entries by tags
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <input
                    type="text"
                    placeholder="Tags (comma-separated)"
                    value={customTags}
                    onChange={(e) => setCustomTags(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                  <Button
                    onClick={() => {
                      if (customTags) {
                        const tags = customTags.split(',').map(tag => tag.trim());
                        invalidateByTags(tags);
                      }
                    }}
                    disabled={isInvalidating || !customTags}
                    className="w-full"
                  >
                    Invalidate by Tags
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Event-based Invalidation</CardTitle>
                  <CardDescription>
                    Trigger invalidation by event
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <input
                    type="text"
                    placeholder="Event type"
                    value={customEvent}
                    onChange={(e) => setCustomEvent(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                  <Button
                    onClick={() => {
                      if (customEvent) {
                        invalidateByEvent(customEvent);
                      }
                    }}
                    disabled={isInvalidating || !customEvent}
                    className="w-full"
                  >
                    Trigger Event
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Version-based Invalidation</CardTitle>
                  <CardDescription>
                    Update version to invalidate related caches
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <input
                    type="text"
                    placeholder="Version key"
                    value={versionKey}
                    onChange={(e) => setVersionKey(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                  <input
                    type="text"
                    placeholder="New version"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                  <Button
                    onClick={() => {
                      if (versionKey && newVersion) {
                        invalidateByVersion(versionKey, newVersion);
                      }
                    }}
                    disabled={isInvalidating || !versionKey || !newVersion}
                    className="w-full"
                  >
                    Update Version
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Invalidation History</CardTitle>
                    <CardDescription>
                      Recent cache invalidation activities
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={refreshStats}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={clearHistory}
                      variant="outline"
                      size="sm"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {invalidationHistory.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No invalidation history yet
                      </p>
                    ) : (
                      invalidationHistory.map((result, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className={getInvalidationStatusColor(result)}>
                              {getInvalidationStatusIcon(result)}
                            </div>
                            <div>
                              <p className="font-medium">
                                {result.success ? 'Success' : 'Failed'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {result.invalidatedKeys.length} keys invalidated
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {formatDuration(result.duration)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatTimestamp(Date.now() - (invalidationHistory.length - index - 1) * 60000)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Debug Logs</CardTitle>
                    <CardDescription>
                      Cache invalidation debug information
                    </CardDescription>
                  </div>
                  <Button
                    onClick={clearLogs}
                    variant="outline"
                    size="sm"
                  >
                    Clear Logs
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {logs.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No logs yet
                      </p>
                    ) : (
                      logs.map((log, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-2 border rounded text-sm"
                        >
                          <Badge variant="outline" className="text-xs">
                            {log.type}
                          </Badge>
                          <div className="flex-1">
                            <p>{log.message}</p>
                            {log.data && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {JSON.stringify(log.data, null, 2)}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface CacheInvalidationStatusProps {
  className?: string;
}

export function CacheInvalidationStatus({ className }: CacheInvalidationStatusProps) {
  const { isInvalidating, lastInvalidation, stats } = useCacheInvalidation();
  const { isOnline } = useAutoCacheInvalidation();

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cache Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isInvalidating ? 'bg-yellow-500' : 
                isOnline ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm">
                {isInvalidating ? 'Invalidating...' : 
                 isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {stats?.totalInvalidations || 0} total
            </div>
          </div>
          
          {lastInvalidation && (
            <div className="mt-2 text-xs text-muted-foreground">
              Last: {lastInvalidation.success ? 'Success' : 'Failed'} 
              {' '}({lastInvalidation.invalidatedKeys.length} keys)
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}