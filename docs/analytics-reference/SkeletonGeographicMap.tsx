import React from 'react';

export const SkeletonGeographicMap: React.FC = () => {
  return (
    <div className="p-4 bg-background rounded-lg shadow-lg animate-pulse">
      <div className="h-8 bg-muted rounded w-1/3 mb-4"></div> {/* Title */} 
      
      {/* Controls Skeleton */}
      <div className="flex flex-wrap gap-4 p-4 bg-card rounded-lg shadow-sm">
        <div className="h-10 bg-muted rounded w-32"></div>
        <div className="h-10 bg-muted rounded w-32"></div>
        <div className="h-10 bg-muted rounded w-32"></div>
        <div className="h-10 bg-muted rounded w-32"></div>
      </div>

      {/* Map Skeleton */}
      <div className="mt-4 bg-card rounded-lg shadow-sm" style={{ height: 500 }}>
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Loading Map...
        </div>
      </div>

      {/* Insights Panel Skeleton */}
      <div className="p-4 bg-card rounded-lg shadow-sm mt-4">
        <div className="h-6 bg-muted rounded w-1/4 mb-2"></div>
        <div className="h-4 bg-muted rounded w-full mb-1"></div>
        <div className="h-4 bg-muted rounded w-5/6 mb-1"></div>
        <div className="h-4 bg-muted rounded w-3/4"></div>
      </div>
    </div>
  );
};