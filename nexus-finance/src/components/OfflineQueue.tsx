/**
 * Offline Queue UI Components
 * 
 * UI components for offline queue management and monitoring.
 */

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
import { useOfflineQueue, useOfflineQueueMonitor, useRequestManager } from '@/hooks/use-offline-queue';
import { 
  Wifi, 
  WifiOff, 
  Clock, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Trash2, 
  Play, 
  Pause, 
  RotateCcw,
  Upload,
  Download,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Settings,
  Filter,
  Calendar
} from 'lucide-react';

interface OfflineQueueDashboardProps {
  className?: string;
}

export function OfflineQueueDashboard({ className }: OfflineQueueDashboardProps) {
  const {
    isOnline,
    metrics,
    pendingRequests,
    failedRequests,
    config,
    retryFailedRequests,
    clearCompletedRequests,
    clearAllRequests,
    updateConfig,
    getQueueStatistics
  } = useOfflineQueue({
    autoStart: true,
    enableRealTimeUpdates: true,
    onRequestAdded: (request) => console.log('📤 Request added:', request.id),
    onRequestCompleted: (request) => console.log('✅ Request completed:', request.id),
    onRequestFailed: (request) => console.log('❌ Request failed:', request.id),
    onOnline: () => console.log('🌐 Online'),
    onOffline: () => console.log('📴 Offline')
  });

  const { alerts, clearAlerts } = useOfflineQueueMonitor();
  const { addFinancialRequest, addUserRequest, addCacheRequest } = useRequestManager();

  const [activeTab, setActiveTab] = useState('overview');
  const [showDetails, setShowDetails] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const stats = getQueueStatistics();

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'failed': return 'destructive';
      case 'processing': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  // Chart data
  const priorityData = [
    { name: 'Critical', value: stats.priorityDistribution.critical, color: '#dc2626' },
    { name: 'High', value: stats.priorityDistribution.high, color: '#ea580c' },
    { name: 'Medium', value: stats.priorityDistribution.medium, color: '#3b82f6' },
    { name: 'Low', value: stats.priorityDistribution.low, color: '#6b7280' }
  ];

  const statusData = [
    { name: 'Pending', value: metrics.pendingRequests, color: '#f59e0b' },
    { name: 'Processing', value: metrics.processingRequests, color: '#3b82f6' },
    { name: 'Completed', value: metrics.completedRequests, color: '#10b981' },
    { name: 'Failed', value: metrics.failedRequests, color: '#ef4444' }
  ];

  const filteredRequests = pendingRequests.filter(req => 
    priorityFilter === 'all' || req.priority === priorityFilter
  );

  return (
    <div className={className}>
      <div className="grid gap-6">
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Offline Queue Dashboard</h2>
            <p className="text-gray-600">Advanced offline queue management and monitoring</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </Badge>
            <Badge variant={metrics.queueSize > 0 ? "default" : "secondary"}>
              <Database className="w-3 h-3 mr-1" />
              {metrics.queueSize} in Queue
            </Badge>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">
                {metrics.completedRequests}/{metrics.totalRequests} completed
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Queue Size</CardTitle>
              <Database className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.queueSize}</div>
              <div className="text-xs text-muted-foreground">
                {metrics.pendingRequests} pending
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(metrics.averageProcessingTime)}</div>
              <div className="text-xs text-muted-foreground">
                Per request
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Queue Utilization</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.queueUtilization.toFixed(1)}%</div>
              <Progress value={stats.queueUtilization} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <Alert key={index} variant={alert.type === 'error' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{alert.message}</AlertDescription>
              </Alert>
            ))}
            <Button variant="outline" size="sm" onClick={clearAlerts}>
              Clear Alerts
            </Button>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="queue">Queue</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Priority Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Priority Distribution</CardTitle>
                  <CardDescription>Requests by priority level</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={priorityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {priorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 flex justify-center gap-4 text-sm">
                    {priorityData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span>{entry.name}: {entry.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                  <CardDescription>Requests by current status</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={statusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6">
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common queue management operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Button
                    onClick={retryFailedRequests}
                    disabled={!isOnline || metrics.failedRequests === 0}
                    className="w-full"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retry Failed
                  </Button>
                  
                  <Button
                    onClick={clearCompletedRequests}
                    variant="outline"
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Completed
                  </Button>
                  
                  <Button
                    onClick={() => setShowDetails(!showDetails)}
                    variant="outline"
                    className="w-full"
                  >
                    {showDetails ? 'Hide' : 'Show'} Details
                  </Button>
                  
                  <Button
                    onClick={() => updateConfig({ autoProcessOnOnline: !config.autoProcessOnOnline })}
                    variant="outline"
                    className="w-full"
                  >
                    {config.autoProcessOnOnline ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {config.autoProcessOnOnline ? 'Pause Auto' : 'Resume Auto'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="queue" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Requests</CardTitle>
                <CardDescription>Requests waiting to be processed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="all">All Priorities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <Badge variant="outline">
                    {filteredRequests.length} requests
                  </Badge>
                </div>
                
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {filteredRequests.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No pending requests</p>
                      </div>
                    ) : (
                      filteredRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              request.status === 'completed' ? 'bg-green-500' :
                              request.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                              request.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                            }`} />
                            <div>
                              <div className="font-medium">{request.method.toUpperCase()}</div>
                              <div className="text-sm text-gray-500">{request.url}</div>
                              <div className="text-xs text-gray-400">
                                {formatTimestamp(request.timestamp)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getPriorityColor(request.priority)}>
                              {request.priority}
                            </Badge>
                            {request.retryCount > 0 && (
                              <Badge variant="outline">Retry {request.retryCount}</Badge>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {/* Cancel request */}}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="failed" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Failed Requests</CardTitle>
                <CardDescription>Requests that failed and need attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="destructive">
                    {failedRequests.length} failed requests
                  </Badge>
                  <Button
                    onClick={retryFailedRequests}
                    disabled={!isOnline}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retry All
                  </Button>
                </div>
                
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {failedRequests.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No failed requests</p>
                      </div>
                    ) : (
                      failedRequests.map((request) => (
                        <div key={request.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium">{request.method.toUpperCase()}</div>
                            <Badge variant="destructive">Failed</Badge>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">{request.url}</div>
                          <div className="text-sm text-red-600 mb-2">
                            Error: {request.lastError || 'Unknown error'}
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Retry: {request.retryCount}/{request.maxRetries}</span>
                            <span>{formatTimestamp(request.timestamp)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Queue Statistics</CardTitle>
                  <CardDescription>Detailed queue performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Requests</span>
                    <Badge variant="outline">{metrics.totalRequests}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Success Rate</span>
                    <Badge variant="outline">{stats.successRate.toFixed(1)}%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Processing Time</span>
                    <Badge variant="outline">{formatDuration(metrics.averageProcessingTime)}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Queue Utilization</span>
                    <Badge variant="outline">{stats.queueUtilization.toFixed(1)}%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Retry Count</span>
                    <Badge variant="outline">{stats.averageRetryCount.toFixed(1)}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Configuration</CardTitle>
                  <CardDescription>Current queue settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Max Queue Size</span>
                    <Badge variant="outline">{config.maxQueueSize}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Batch Size</span>
                    <Badge variant="outline">{config.batchSize}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Batch Timeout</span>
                    <Badge variant="outline">{config.batchTimeout}ms</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Retries</span>
                    <Badge variant="outline">{config.maxRetries}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Priority Processing</span>
                    <Badge variant={config.priorityProcessing ? "default" : "secondary"}>
                      {config.priorityProcessing ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Queue Configuration</CardTitle>
                <CardDescription>Configure offline queue behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Auto Process on Online</div>
                    <div className="text-sm text-gray-500">Automatically process queue when online</div>
                  </div>
                  <Button
                    variant={config.autoProcessOnOnline ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateConfig({ autoProcessOnOnline: !config.autoProcessOnOnline })}
                  >
                    {config.autoProcessOnOnline ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Priority Processing</div>
                    <div className="text-sm text-gray-500">Process high priority requests first</div>
                  </div>
                  <Button
                    variant={config.priorityProcessing ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateConfig({ priorityProcessing: !config.priorityProcessing })}
                  >
                    {config.priorityProcessing ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Persist Queue</div>
                    <div className="text-sm text-gray-500">Save queue to local storage</div>
                  </div>
                  <Button
                    variant={config.persistQueue ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateConfig({ persistQueue: !config.persistQueue })}
                  >
                    {config.persistQueue ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Batch Size</div>
                    <div className="text-sm text-gray-500">{config.batchSize} requests per batch</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateConfig({ batchSize: Math.max(1, config.batchSize - 1) })}
                    >
                      -
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateConfig({ batchSize: config.batchSize + 1 })}
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