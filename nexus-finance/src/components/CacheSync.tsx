'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { useCacheSync, useSyncConflicts, useSyncOperations, useSyncMetrics } from '@/hooks/use-cache-sync';
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Zap, 
  Wifi, 
  WifiOff, 
  Settings, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Eye,
  EyeOff,
  Download,
  Upload
} from 'lucide-react';

interface CacheSyncDashboardProps {
  className?: string;
}

export function CacheSyncDashboard({ className }: CacheSyncDashboardProps) {
  const {
    isOnline,
    isSyncing,
    metrics,
    pendingOperations,
    conflicts,
    config,
    forceSync,
    updateConfig,
    getSyncStatistics
  } = useCacheSync({
    autoStart: true,
    enableRealTimeUpdates: true,
    onSyncStart: () => console.log('🔄 Sync started'),
    onSyncComplete: (duration) => console.log(`✅ Sync completed in ${duration}ms`),
    onConflictDetected: (conflict) => console.log('⚠️ Conflict detected:', conflict),
    onConflictResolved: (conflict) => console.log('✅ Conflict resolved:', conflict)
  });

  const { getPerformanceGrade, getSyncTrend } = useSyncMetrics();
  const { resolveConflict, getUnresolvedConflicts } = useSyncConflicts();
  const { addFinancialOperation, retryFailedOperations } = useSyncOperations();

  const [activeTab, setActiveTab] = useState('overview');
  const [showDetails, setShowDetails] = useState(false);

  const stats = getSyncStatistics();
  const performanceGrade = getPerformanceGrade();
  const syncTrend = getSyncTrend();
  const unresolvedConflicts = getUnresolvedConflicts();

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-50';
      case 'B': return 'text-blue-600 bg-blue-50';
      case 'C': return 'text-yellow-600 bg-yellow-50';
      case 'D': return 'text-orange-600 bg-orange-50';
      default: return 'text-red-600 bg-red-50';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const syncPerformanceData = [
    { name: 'Success', value: stats.successfulSyncs, color: '#10b981' },
    { name: 'Failed', value: stats.failedSyncs, color: '#ef4444' },
    { name: 'Pending', value: stats.pendingOperations, color: '#f59e0b' }
  ];

  const priorityData = [
    { name: 'Critical', value: getOperationsByPriority('critical').length, color: '#dc2626' },
    { name: 'High', value: getOperationsByPriority('high').length, color: '#ea580c' },
    { name: 'Medium', value: getOperationsByPriority('medium').length, color: '#3b82f6' },
    { name: 'Low', value: getOperationsByPriority('low').length, color: '#6b7280' }
  ];

  function getOperationsByPriority(priority: string) {
    return pendingOperations.filter(op => op.priority === priority);
  }

  return (
    <div className={className}>
      <div className="grid gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Cache Sync Dashboard</h2>
            <p className="text-gray-600">Advanced cache synchronization and conflict management</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </Badge>
            <Badge variant={isSyncing ? "default" : "secondary"}>
              <RefreshCw className="w-3 h-3 mr-1" />
              {isSyncing ? 'SYNCING' : 'IDLE'}
            </Badge>
            <Badge className={getGradeColor(performanceGrade)}>
              Grade {performanceGrade}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sync Success Rate</CardTitle>
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(stats.successRate)}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {getTrendIcon(syncTrend)}
                <span>{syncTrend}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Queue Size</CardTitle>
              <Database className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.queueSize}</div>
              <div className="text-xs text-muted-foreground">
                {stats.pendingOperations} pending
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Sync Time</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(stats.averageSyncTime)}</div>
              <div className="text-xs text-muted-foreground">
                Last: {metrics.lastSyncTime ? formatDuration(metrics.lastSyncTime) : 'Never'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conflicts</CardTitle>
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.conflictCount}</div>
              <div className="text-xs text-muted-foreground">
                {unresolvedConflicts.length} unresolved
              </div>
            </CardContent>
          </Card>
        </div>

        {unresolvedConflicts.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have {unresolvedConflicts.length} unresolved sync conflict{unresolvedConflicts.length > 1 ? 's' : ''}. 
              <Button variant="link" onClick={() => setActiveTab('conflicts')} className="ml-2">
                Resolve conflicts
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Sync Performance</CardTitle>
                  <CardDescription>Success, failure, and pending operations</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={syncPerformanceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {syncPerformanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 flex justify-center gap-4 text-sm">
                    {syncPerformanceData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span>{entry.name}: {entry.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Priority Distribution</CardTitle>
                  <CardDescription>Operations by priority level</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={priorityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6">
                        {priorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common sync operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Button
                    onClick={forceSync}
                    disabled={isSyncing || !isOnline}
                    className="w-full"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    Force Sync
                  </Button>
                  
                  <Button
                    onClick={retryFailedOperations}
                    variant="outline"
                    className="w-full"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retry Failed
                  </Button>
                  
                  <Button
                    onClick={() => setShowDetails(!showDetails)}
                    variant="outline"
                    className="w-full"
                  >
                    {showDetails ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                    {showDetails ? 'Hide' : 'Show'} Details
                  </Button>
                  
                  <Button
                    onClick={() => updateConfig({ autoSync: !config.autoSync })}
                    variant="outline"
                    className="w-full"
                  >
                    {config.autoSync ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {config.autoSync ? 'Pause' : 'Resume'} Auto
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sync Operations</CardTitle>
                <CardDescription>Queue and manage synchronization operations</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {pendingOperations.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No pending operations</p>
                      </div>
                    ) : (
                      pendingOperations.map((operation) => (
                        <div key={operation.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              operation.status === 'completed' ? 'bg-green-500' :
                              operation.status === 'syncing' ? 'bg-blue-500 animate-pulse' :
                              operation.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                            }`} />
                            <div>
                              <div className="font-medium">{operation.type.toUpperCase()}</div>
                              <div className="text-sm text-gray-500">
                                {operation.resource}/{operation.resourceId}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              operation.priority === 'critical' ? 'destructive' :
                              operation.priority === 'high' ? 'default' :
                              operation.priority === 'medium' ? 'secondary' : 'outline'
                            }>
                              {operation.priority}
                            </Badge>
                            {operation.retryCount > 0 && (
                              <Badge variant="outline">Retry {operation.retryCount}</Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conflicts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sync Conflicts</CardTitle>
                <CardDescription>Resolve synchronization conflicts</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {conflicts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No conflicts detected</p>
                      </div>
                    ) : (
                      conflicts.map((conflict) => (
                        <div key={conflict.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="font-medium">
                                {conflict.resource}/{conflict.resourceId}
                              </div>
                              <div className="text-sm text-gray-500">
                                {conflict.conflictType} conflict • {new Date(conflict.timestamp).toLocaleString()}
                              </div>
                            </div>
                            <Badge variant={conflict.status === 'resolved' ? 'default' : 'destructive'}>
                              {conflict.status}
                            </Badge>
                          </div>
                          
                          {conflict.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => resolveConflict(conflict.id, 'local')}
                              >
                                Keep Local
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resolveConflict(conflict.id, 'remote')}
                              >
                                Use Remote
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resolveConflict(conflict.id, 'merge')}
                              >
                                Merge
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Sync Statistics</CardTitle>
                  <CardDescription>Detailed performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Operations</span>
                    <Badge variant="outline">{stats.totalOperations}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Successful Syncs</span>
                    <Badge variant="outline">{stats.successfulSyncs}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed Syncs</span>
                    <Badge variant="outline">{stats.failedSyncs}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Conflicts Resolved</span>
                    <Badge variant="outline">{stats.conflictsResolved}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Retry Count</span>
                    <Badge variant="outline">{stats.averageRetryCount.toFixed(1)}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Grade</CardTitle>
                  <CardDescription>Overall sync performance rating</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className={`text-6xl font-bold mb-4 ${getGradeColor(performanceGrade)}`}>
                      {performanceGrade}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Success Rate</span>
                        <span>{formatPercentage(stats.successRate)}</span>
                      </div>
                      <Progress value={stats.successRate * 100} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sync Configuration</CardTitle>
                <CardDescription>Configure synchronization behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Auto Sync</div>
                    <div className="text-sm text-gray-500">Automatically sync pending operations</div>
                  </div>
                  <Button
                    variant={config.autoSync ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateConfig({ autoSync: !config.autoSync })}
                  >
                    {config.autoSync ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Delta Sync</div>
                    <div className="text-sm text-gray-500">Sync only changed data</div>
                  </div>
                  <Button
                    variant={config.enableDeltaSync ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateConfig({ enableDeltaSync: !config.enableDeltaSync })}
                  >
                    {config.enableDeltaSync ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Background Sync</div>
                    <div className="text-sm text-gray-500">Sync in background when possible</div>
                  </div>
                  <Button
                    variant={config.backgroundSync ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateConfig({ backgroundSync: !config.backgroundSync })}
                  >
                    {config.backgroundSync ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Sync Interval</div>
                    <div className="text-sm text-gray-500">{config.syncInterval / 1000}s</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateConfig({ syncInterval: Math.max(10000, config.syncInterval - 10000) })}
                    >
                      -
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateConfig({ syncInterval: config.syncInterval + 10000 })}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}