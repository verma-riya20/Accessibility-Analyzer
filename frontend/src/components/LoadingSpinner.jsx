import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center flex-col">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        
        <div className="mt-6 space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Analyzing Website
          </h3>
          <p className="text-gray-600">
            This may take a few moments...
          </p>
          
          <div className="mt-4 space-y-1 text-sm text-gray-500">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-primary-600 rounded-full animate-pulse"></div>
              <span>Loading webpage content</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-primary-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <span>Checking accessibility issues</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-primary-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              <span>Generating report</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
