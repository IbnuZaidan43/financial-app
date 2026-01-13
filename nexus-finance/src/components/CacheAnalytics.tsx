/**
 * Cache Analytics UI Components
 * 
 * UI components for cache monitoring, analytics, and performance visualization.
 */

'use client';

import React, { useState, useEffect } from 'react';
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
import { 
  useCacheAnalytics,
  useCachePerformanceMonitor,
  useCacheAlerts,
  useCacheRecommendations,
  type CacheMetrics,
  type CacheRecommendation,
  type CacheAlert
} from '@/hooks/use-cache-analytics';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Database, 
  Zap, 
  Clock, 
  HardDrive, 
  BarChart3, 
  Download, 
  Upload, 
  RefreshCw,
  Info,
  AlertCircle,
  Target,
  Settings,
  Trash2,
  FileText
} from 'lucide-react';

interface CacheAnalyticsDashboardProps {
  className?: string;
}

export function CacheAnalyticsDashboard({ className }: CacheAnalyticsDashboardProps) {
  const {
    isMonitoring,
    currentMetrics,
    report,
    recommendations,
    alerts,
    startMonitoring,
    stopMonitoring,
    refreshMetrics,
    generateReport,
    clearData,
    exportData
  } = useCacheAnalytics({
    autoStart: true,
    enableRealTimeMonitoring: true,
    monitoringInterval: 30000,
    onAlert: (alert) => {
      console.log('📊 Cache Alert:', alert);
    }
  });

  const {
    performanceData,
    getAverageHitRate,
    getAverageResponseTime,
    hitRateTrend,
    responseTimeTrend
  } = useCachePerformanceMonitor();

  const { unreadCount, getUnreadAlerts, markAllAsRead } = useCacheAlerts();
  const { getUnimplementedRecommendations } = useCacheRecommendations();

  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('1h');

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  // Chart data preparation
  const hitRateChartData = performanceData.timestamps.map((timestamp, index) => ({
    time: new Date(timestamp).toLocaleTimeString(),
    hitRate: performanceData.hitRate[index] || 0
  }));

  const responseTimeChartData = performanceData.timestamps.map((timestamp, index) => ({
    time: new Date(timestamp).toLocaleTimeString(),
    responseTime: performanceData.responseTime[index] || 0
  }));

  const storageChartData = currentMetrics ? [
    { name: 'Used', value: currentMetrics.totalSize, color: '#3b82f6' },
    { name: 'Free', value: Math.max(0, 50 * 1024 * 1024 - currentMetrics.totalSize), color: '#e5e7eb' }
  ] : [];

  const cacheTypeData = currentMetrics ? [
    { name: 'Hits', value: currentMetrics.hitRate, color: '#10b981' },
    { name: 'Misses', value: currentMetrics.missRate, color: '#ef4444' }
  ] : [];

  return (
    <div className={className}>
      <div className="grid gap-6">
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Cache Analytics Dashboard</h2>
            <p className="text-gray-600">Real-time cache performance monitoring and analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isMonitoring ? "default" : "secondary"}>
              {isMonitoring ? 'Monitoring' : 'Stopped'}
            </Badge>
            <Button
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              variant={isMonitoring ? "outline" : "default"}
              size="sm"
            >
              {isMonitoring ? 'Stop' : 'Start'} Monitoring
            </Button>
            <Button onClick={refreshMetrics} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentMetrics ? formatPercentage(currentMetrics.hitRate) : '0%'}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {getTrendIcon(hitRateTrend)}
                <span>{hitRateTrend}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentMetrics ? `${currentMetrics.averageResponseTime.toFixed(0)}ms` : '0ms'}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {getTrendIcon(responseTimeTrend)}
                <span>{responseTimeTrend}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentMetrics ? formatBytes(currentMetrics.totalSize) : '0 B'}
              </div>
              <div className="text-xs text-muted-foreground">
                {currentMetrics ? `${currentMetrics.totalEntries} entries` : '0 entries'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compression Ratio</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentMetrics ? formatPercentage(currentMetrics.compressionRatio) : '0%'}
              </div>
              <div className="text-xs text-muted-foreground">
                {currentMetrics && currentMetrics.compressionRatio > 0.5 ? 'Good' : 'Improve'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Section */}
        {unreadCount > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have {unreadCount} unread cache alert{unreadCount > 1 ? 's' : ''}. 
              <Button variant="link" onClick={markAllAsRead} className="ml-2">
                Mark all as read
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Storage Usage Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Storage Usage</CardTitle>
                  <CardDescription>Current cache storage utilization</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={storageChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {storageChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatBytes(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    {currentMetrics && formatBytes(currentMetrics.totalSize)} of 50 MB used
                  </div>
                </CardContent>
              </Card>

              {/* Hit Rate Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Cache Performance</CardTitle>
                  <CardDescription>Hit rate vs miss rate</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={cacheTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {cacheTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatPercentage(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    {currentMetrics ? formatPercentage(currentMetrics.hitRate) : '0%'} hit rate
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Hit Rate Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Hit Rate Trend</CardTitle>
                <CardDescription>Cache hit rate over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={hitRateChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 1]} tickFormatter={(value) => formatPercentage(value)} />
                    <Tooltip 
                      formatter={(value: number) => [formatPercentage(value), 'Hit Rate']}
                      labelFormatter={(label) => `Time: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="hitRate" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Response Time Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Response Time Trend</CardTitle>
                  <CardDescription>Average cache response time over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={responseTimeChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toFixed(0)}ms`, 'Response Time']}
                        labelFormatter={(label) => `Time: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="responseTime" 
                        stroke="#ef4444" 
                        fill="#ef4444"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>Detailed cache performance indicators</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentMetrics && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total Entries</span>
                        <Badge variant="outline">{currentMetrics.totalEntries}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Miss Rate</span>
                        <Badge variant="outline">{formatPercentage(currentMetrics.missRate)}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Eviction Rate</span>
                        <Badge variant="outline">{formatPercentage(currentMetrics.evictionRate)}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Last Updated</span>
                        <Badge variant="outline">
                          {new Date(currentMetrics.lastUpdated).toLocaleTimeString()}
                        </Badge>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Cache Alerts</CardTitle>
                    <CardDescription>Performance and storage alerts</CardDescription>
                  </div>
                  <Button onClick={() => getUnreadAlerts()} variant="outline" size="sm">
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {getUnreadAlerts().length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                        <p className="text-gray-600">No active alerts</p>
                      </div>
                    ) : (
                      getUnreadAlerts().map((alert, index) => (
                        <Alert key={index} variant={alert.type === 'error' ? 'destructive' : 'default'}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="flex items-center justify-between">
                              <div>
                                <strong>{alert.title}</strong>
                                <p className="text-sm mt-1">{alert.message}</p>
                              </div>
                              <Badge variant={getSeverityColor(alert.severity)}>
                                {alert.severity}
                              </Badge>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Optimization Recommendations</CardTitle>
                <CardDescription>AI-powered cache optimization suggestions</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {getUnimplementedRecommendations().length === 0 ? (
                      <div className="text-center py-8">
                        <Target className="h-12 w-12 text-green-600 mx-auto mb-4" />
                        <p className="text-gray-600">All recommendations implemented!</p>
                      </div>
                    ) : (
                      getUnimplementedRecommendations().map((rec, index) => (
                        <Card key={index} className="border-l-4 border-l-blue-500">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{rec.title}</CardTitle>
                              <Badge variant={getPriorityColor(rec.priority)}>
                                {rec.priority}
                              </Badge>
                            </div>
                            <CardDescription>{rec.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-2">
                              <div>
                                <strong>Action:</strong> {rec.action}
                              </div>
                              <div>
                                <strong>Impact:</strong> {rec.impact}
                              </div>
                              <div>
                                <strong>Est. Improvement:</strong> {rec.estimatedImprovement}
                              </div>
                              <Button size="sm" className="mt-2">
                                Implement
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Export Analytics Data</CardTitle>
                  <CardDescription>Download cache analytics data for analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={() => {
                    const data = exportData();
                    if (data) {
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `cache-analytics-${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                  }} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                  <Button onClick={generateReport} variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Management</CardTitle>
                  <CardDescription>Clear and reset analytics data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={clearData} variant="outline" className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Data
                  </Button>
                  <Button onClick={refreshMetrics} variant="outline" className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Metrics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface CacheAnalyticsStatusProps {
  className?: string;
}

export function CacheAnalyticsStatus({ className }: CacheAnalyticsStatusProps) {
  const { isMonitoring, currentMetrics } = useCacheAnalytics();
  const { getAverageHitRate } = useCachePerformanceMonitor();
  const { unreadCount } = useCacheAlerts();

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cache Analytics Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isMonitoring ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span className="text-sm">
                {isMonitoring ? 'Monitoring' : 'Idle'}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">
                {currentMetrics ? formatPercentage(currentMetrics.hitRate) : '0%'}
              </div>
              <div className="text-xs text-muted-foreground">
                Hit Rate
              </div>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-orange-600">
                {unreadCount} alert{unreadCount > 1 ? 's' : ''}
              </span>
              <Button size="sm" variant="outline">
                View
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}