import React from 'react';

export const SkeletonSankeyDashboard: React.FC = () => {
  return (
    <div className="p-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200 rounded-lg animate-pulse">
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="h-8 bg-indigo-200 rounded w-64 mb-2"></div> {/* Title */} 
            <div className="h-6 bg-purple-200 rounded w-96"></div> {/* Description */} 
          </div>
          
          {/* View Selector Skeleton */}
          <div className="flex items-center space-x-2 bg-white rounded-lg p-1 shadow-sm border border-indigo-200">
            <div className="h-10 bg-gray-200 rounded-md w-32"></div>
            <div className="h-10 bg-gray-200 rounded-md w-32"></div>
            <div className="h-10 bg-gray-200 rounded-md w-32"></div>
          </div>
        </div>
        
        {/* View Description Skeleton */}
        <div className="mt-4 p-3 bg-white/60 rounded-lg border border-indigo-100">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
      
      {/* Sankey Chart Skeleton */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-indigo-100" style={{ height: '500px' }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="h-12 w-12 bg-gray-300 rounded-full mx-auto mb-3"></div>
            <div className="h-4 bg-gray-300 rounded w-48 mb-1"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
        </div>
      </div>
      
      {/* Insights Panel Skeleton */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-indigo-200">
          <div className="h-5 bg-indigo-300 rounded w-2/3 mb-2"></div>
          <div className="h-8 bg-indigo-300 rounded w-1/2"></div>
          <div className="h-4 bg-indigo-200 rounded w-full"></div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-purple-200">
          <div className="h-5 bg-purple-300 rounded w-2/3 mb-2"></div>
          <div className="h-8 bg-purple-300 rounded w-1/2"></div>
          <div className="h-4 bg-purple-200 rounded w-full"></div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-pink-200">
          <div className="h-5 bg-pink-300 rounded w-2/3 mb-2"></div>
          <div className="h-8 bg-pink-300 rounded w-1/2"></div>
          <div className="h-4 bg-pink-200 rounded w-full"></div>
        </div>
      </div>
    </div>
  );
};