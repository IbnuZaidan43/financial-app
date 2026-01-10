'use client';

// Tambahkan impor useState dan useEffect
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAssetOptimization } from '@/hooks/use-asset-optimization';

// Pindahkan atau definisikan formatBytes di sini jika di @/lib/utils tidak ada
const formatBytes = (bytes: number, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

interface AssetOptimizationDashboardProps {
  className?: string;
}

export function AssetOptimizationDashboard({ className }: AssetOptimizationDashboardProps) {
  const {
    stats,
    loading,
    error,
    optimizedAssets,
    refreshStats,
    clearCache,
    warmCache
  } = useAssetOptimization({
    autoPreload: true,
    autoLazyLoad: true,
    statsInterval: 30000
  });

  const handleWarmCache = async () => {
    const criticalAssets = [
      '/app-icons/icon-192x192.png',
      '/app-icons/icon-512x512.png',
      '/manifest.json'
    ];
    
    await warmCache(criticalAssets);
  };

  if (loading && !stats) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Asset Optimization</CardTitle>
          <CardDescription>Loading optimization statistics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Asset Optimization</CardTitle>
          <CardDescription>Error loading optimization data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-destructive p-4">
            <p>{error}</p>
            <Button onClick={refreshStats} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Asset Optimization</CardTitle>
          <CardDescription>No optimization data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground p-4">
            <p>Start optimizing assets to see statistics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Safely prepare chart data dengan pengecekan null/undefined
  const formatData = Object.entries(stats.formatDistribution || {}).map(([format, count]) => ({
    name: format.toUpperCase(),
    value: count
  }));

  const priorityData = Object.entries(stats.priorityDistribution || {}).map(([priority, count]) => ({
    name: priority.charAt(0).toUpperCase() + priority.slice(1),
    value: count
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <div className="h-4 w-4 text-muted-foreground">📁</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssets || 0}</div>
            <p className="text-xs text-muted-foreground">Optimized assets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            <div className="h-4 w-4 text-muted-foreground">💾</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(stats.totalSize || 0)}</div>
            <p className="text-xs text-muted-foreground">Cached assets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <div className="h-4 w-4 text-muted-foreground">🎯</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((stats.cacheHitRate || 0) * 100)}%</div>
            <p className="text-xs text-muted-foreground">Cache efficiency</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Load Time</CardTitle>
            <div className="h-4 w-4 text-muted-foreground">⚡</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.averageLoadTime || 0)}ms</div>
            <p className="text-xs text-muted-foreground">Average load time</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Format Distribution</CardTitle>
            <CardDescription>Asset formats in cache</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formatData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {formatData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
            <CardDescription>Assets by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Optimizations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Optimizations</CardTitle>
          <CardDescription>Recently optimized assets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from(optimizedAssets?.entries() || [])
              .slice(-5)
              .reverse()
              .map(([url, result]: [string, any]) => (
                <div key={url} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{url}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {result.format}
                      </Badge>
                      <Badge variant={result.cached ? "default" : "secondary"} className="text-xs">
                        {result.cached ? "Cached" : "Fresh"}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatBytes(result.optimizedSize)}</p>
                    {result.compressionRatio > 0 && (
                      <p className="text-xs text-green-600">
                        -{Math.round(result.compressionRatio * 100)}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            
            {(!optimizedAssets || optimizedAssets.size === 0) && (
              <div className="text-center text-muted-foreground p-4">
                <p>No assets optimized yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Management</CardTitle>
          <CardDescription>Manage asset optimization cache</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={refreshStats} variant="outline" size="sm">
              Refresh Stats
            </Button>
            <Button onClick={handleWarmCache} variant="outline" size="sm">
              Warm Cache
            </Button>
            <Button 
              onClick={clearCache} 
              variant="outline" 
              size="sm"
              className="text-destructive hover:text-destructive"
            >
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// AssetStatus Component
export function AssetStatus({ url, className }: { url: string; className?: string }) {
  const { optimizedAssets } = useAssetOptimization();
  const optimization = optimizedAssets?.get(url);

  if (!optimization) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
        <span className="text-xs text-muted-foreground">Not optimized</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${
        optimization.cached ? 'bg-green-500' : 'bg-blue-500'
      }`}></div>
      <span className="text-xs text-muted-foreground">
        {optimization.format} • {formatBytes(optimization.optimizedSize)}
        {optimization.compressionRatio > 0 && (
          <span className="text-green-600 ml-1">
            (-{Math.round(optimization.compressionRatio * 100)}%)
          </span>
        )}
      </span>
    </div>
  );
}

// OptimizedImage Component
export function OptimizedImage({ 
  src, 
  alt, 
  className, 
  width, 
  height, 
  priority = false,
  placeholder 
}: OptimizedImageProps) {
  const { optimizeAsset } = useAssetOptimization();
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (priority) {
      optimizeAsset(src)
        .then(() => {
          if (isMounted) {
            setImageSrc(src);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.warn('Failed to optimize priority image:', src, err);
          if (isMounted) {
            setImageSrc(src);
            setLoading(false);
          }
        });
    } else {
      setImageSrc(placeholder || '');
      setLoading(false);
    }

    return () => { isMounted = false; };
  }, [src, priority, placeholder, optimizeAsset]);

  const handleLoad = () => {
    if (!priority && imageSrc !== src) {
      optimizeAsset(src)
        .then(() => {
          setImageSrc(src);
        })
        .catch((err) => {
          console.warn('Failed to optimize image on load:', src, err);
          setImageSrc(src);
        });
    }
    setLoading(false);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      
      <img
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        onLoad={handleLoad}
        onError={() => {
          setError('Failed to load image');
          setLoading(false);
        }}
        className={`${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        loading={priority ? 'eager' : 'lazy'}
      />
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
          <span className="text-xs text-destructive">Failed to load</span>
        </div>
      )}
    </div>
  );
}

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  placeholder?: string;
}