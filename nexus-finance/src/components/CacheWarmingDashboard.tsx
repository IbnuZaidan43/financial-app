/**
 * Cache Warming Dashboard
 * 
 * Comprehensive dashboard for intelligent cache warming management
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  useCacheWarming,
  useCacheWarmingMonitor,
  useUserBehaviorTracker,
  usePopularContentMonitor,
  useResourcePrioritizer
} from '@/hooks/use-cache-warming';
import {
  Brain,
  TrendingUp,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  Target,
  Layers,
  Activity,
  RefreshCw,
  Play,
  Pause,
  Plus,
  Users,
  Database,
  Wifi,
  Monitor,
  Smartphone,
  Globe,
  Filter,
  Download,
  Upload,
  Settings
} from 'lucide-react';

interface CacheWarmingDashboardProps {
  userId?: string;
  className?: string;
}

export function CacheWarmingDashboard({ userId = 'demo-user', className }: CacheWarmingDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showDetails, setShowDetails] = useState(false);

  // Cache warming state
  const {
    isRunning,
    metrics,
    queueStatus,
    recommendations,
    popularContent,
    prioritizedResources,
    behaviorMetrics,
    startWarming,
    stopWarming,
    addWarmingTask,
    addBehaviorBasedTasks,
    addPopularContentTasks,
    recordBehavior,
    prioritizeResource,
    refreshData
  } = useCacheWarming({
    autoStart: true,
    enableRealTimeUpdates: true,
    userId,
    onWarmingStarted: () => console.log('🔥 Cache warming started'),
    onWarmingStopped: () => console.log('❄️ Cache warming stopped')
  });

  // Monitoring
  const { alerts, clearAlerts } = useCacheWarmingMonitor();

  // User behavior tracking
  const { trackAction, behaviorMetrics: userBehavior } = useUserBehaviorTracker(userId);

  // Popular content monitoring
  const { trendingContent, recordAccess } = usePopularContentMonitor();

  // Resource prioritization
  const { highPriorityResources, criticalResources } = useResourcePrioritizer(userId);

  // Simulate some user activity for demonstration
  useEffect(() => {
    const simulateActivity = () => {
      if (Math.random() > 0.7) {
        const actions = ['view', 'click', 'search', 'navigate'] as const;
        const resources = [
          '/api/transactions',
          '/api/tabungan',
          '/api/analytics',
          '/static/dashboard.js',
          '/static/styles.css'
        ];
        
        const action = actions[Math.floor(Math.random() * actions.length)];
        const resource = resources[Math.floor(Math.random() * resources.length)];
        
        trackAction(action, resource, { simulated: true });
        recordAccess(resource, resource, userId, Math.random() * 1000, true, Math.random() > 0.5);
      }
    };

    const interval = setInterval(simulateActivity, 3000);
    return () => clearInterval(interval);
  }, [trackAction, recordAccess, userId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'loading': return 'text-blue-600';
      case 'pending': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'loading': return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Intelligent Cache Warming Dashboard
          </CardTitle>
          <CardDescription>
            AI-powered cache warming with user behavior analysis and predictive preloading
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={isRunning ? stopWarming : startWarming}
                variant={isRunning ? "destructive" : "default"}
                size="sm"
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Stop Warming
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Warming
                  </>
                )}
              </Button>
              
              <Button onClick={refreshData} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>

              <Badge variant={isRunning ? "default" : "secondary"}>
                {isRunning ? 'ACTIVE' : 'IDLE'}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Activity className="w-4 h-4" />
              <span>Efficiency: {metrics.warmingEfficiency.toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert, index) => (
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
              <Button onClick={clearAlerts} size="sm" variant="outline" className="mt-2">
                Clear Alerts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                    <p className="text-2xl font-bold">{metrics.totalTasks}</p>
                  </div>
                  <Layers className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold">{metrics.warmingEfficiency.toFixed(1)}%</p>
                  </div>
                  <Target className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Data Loaded</p>
                    <p className="text-2xl font-bold">{(metrics.totalDataLoaded / 1024 / 1024).toFixed(1)}MB</p>
                  </div>
                  <Download className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Tasks</p>
                    <p className="text-2xl font-bold">{metrics.activeTasks}</p>
                  </div>
                  <Activity className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Warming Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Completion Rate</span>
                  <span>{metrics.warmingEfficiency.toFixed(1)}%</span>
                </div>
                <Progress value={metrics.warmingEfficiency} className="h-2" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{metrics.completedTasks}</p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{metrics.activeTasks}</p>
                  <p className="text-sm text-gray-600">Active</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">{metrics.queuedTasks}</p>
                  <p className="text-sm text-gray-600">Queued</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{metrics.failedTasks}</p>
                  <p className="text-sm text-gray-600">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button onClick={() => addBehaviorBasedTasks()} className="w-full">
                  <Brain className="w-4 h-4 mr-2" />
                  Add Behavior-Based Tasks
                </Button>
                <Button onClick={() => addPopularContentTasks()} className="w-full" variant="outline">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Add Popular Content Tasks
                </Button>
                <Button onClick={() => addWarmingTask('/api/test', 0.8, 'Test task', 0.9)} className="w-full" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Test Task
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          {/* Queue Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Pending Queue ({queueStatus.pending.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {queueStatus.pending.slice(0, 10).map((task) => (
                      <div key={task.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(task.status)}
                            <span className="text-sm font-medium truncate max-w-48">
                              {task.resource}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {(task.priority * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{task.reason}</p>
                      </div>
                    ))}
                    {queueStatus.pending.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No pending tasks</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Active Tasks ({queueStatus.active.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {queueStatus.active.map((task) => (
                      <div key={task.id} className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(task.status)}
                            <span className="text-sm font-medium truncate max-w-48">
                              {task.resource}
                            </span>
                          </div>
                          <Badge variant="default" className="text-xs">
                            Processing
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{task.reason}</p>
                      </div>
                    ))}
                    {queueStatus.active.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No active tasks</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Completed and Failed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  Completed ({queueStatus.completed.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {queueStatus.completed.slice(0, 5).map((task) => (
                      <div key={task.id} className="p-2 bg-green-50 rounded">
                        <div className="flex items-center justify-between">
                          <span className="text-sm truncate max-w-48">{task.resource}</span>
                          <Badge variant="outline" className="text-xs">
                            {task.completedAt ? new Date(task.completedAt).toLocaleTimeString() : ''}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  Failed ({queueStatus.failed.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {queueStatus.failed.slice(0, 5).map((task) => (
                      <div key={task.id} className="p-2 bg-red-50 rounded">
                        <div className="flex items-center justify-between">
                          <span className="text-sm truncate max-w-48">{task.resource}</span>
                          <Badge variant="destructive" className="text-xs">
                            Error
                          </Badge>
                        </div>
                        {task.error && (
                          <p className="text-xs text-red-600 mt-1">{task.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-4">
          {/* AI Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {recommendations.slice(0, 10).map((rec, index) => (
                    <div key={index} className="p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium">{rec.resourceId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Priority: {(rec.priority * 100).toFixed(0)}%
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {rec.type}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{rec.reason}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Benefit: {rec.estimatedBenefit.toFixed(1)}</span>
                        <span>Size: {(rec.size / 1024).toFixed(1)}KB</span>
                      </div>
                    </div>
                  ))}
                  {recommendations.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No recommendations available</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Popular Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Trending Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {trendingContent.slice(0, 8).map((content, index) => (
                    <div key={content.resourceId} className="p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-medium">{content.resourceId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {content.accessCount} accesses
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {content.uniqueUsers} users
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Score: {content.popularityScore.toFixed(2)}</span>
                        <span>Growth: {(content.growthRate * 100).toFixed(1)}%</span>
                        <span>Hit Rate: {content.cacheHitRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                  {trendingContent.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No trending content</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* High Priority Resources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                High Priority Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {highPriorityResources.slice(0, 8).map((resource, index) => (
                    <div key={resource.resourceId} className="p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium">{resource.resourceId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            {(resource.finalPriority * 100).toFixed(0)}%
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {resource.recommendedAction}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Risk: {resource.riskLevel} | Confidence: {(resource.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  ))}
                  {highPriorityResources.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No high priority resources</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* User Behavior Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Behavior Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userBehavior ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{userBehavior.totalActions}</p>
                    <p className="text-sm text-gray-600">Total Actions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{userBehavior.uniqueResources}</p>
                    <p className="text-sm text-gray-600">Unique Resources</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{userBehavior.mostActiveHour}:00</p>
                    <p className="text-sm text-gray-600">Peak Hour</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{userBehavior.predictions.length}</p>
                    <p className="text-sm text-gray-600">Predictions</p>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">No behavior data available</p>
              )}
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{metrics.averageLoadTime.toFixed(0)}ms</p>
                  <p className="text-sm text-gray-600">Avg Load Time</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{metrics.cacheHitRate.toFixed(1)}%</p>
                  <p className="text-sm text-gray-600">Cache Hit Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{(metrics.networkSavings / 1024 / 1024).toFixed(1)}MB</p>
                  <p className="text-sm text-gray-600">Network Savings</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{new Date(metrics.lastWarmingCycle).toLocaleTimeString()}</p>
                  <p className="text-sm text-gray-600">Last Cycle</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Cache Warming Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">System Status</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Warming System:</span>
                        <Badge variant={isRunning ? "default" : "secondary"}>
                          {isRunning ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Real-time Updates:</span>
                        <Badge variant="default">Enabled</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>User Tracking:</span>
                        <Badge variant="default">Enabled</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Configuration</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Max Concurrent:</span>
                        <span>3 tasks</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Queue Size:</span>
                        <span>50 tasks</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Min Confidence:</span>
                        <span>70%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2 text-blue-800">Intelligence Features</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-blue-600" />
                      <span>Behavior Analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span>Popularity Detection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      <span>Resource Prioritization</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-600" />
                      <span>Predictive Preloading</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}