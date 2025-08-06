import React from 'react';

const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Accessibility Analyzer
            </h1>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            <a 
              href="#" 
              className="text-gray-600 hover:text-gray-900 transition-colors focus-visible"
            >
              About
            </a>
            <a 
              href="#" 
              className="text-gray-600 hover:text-gray-900 transition-colors focus-visible"
            >
              Guidelines
            </a>
            <a 
              href="#" 
              className="text-gray-600 hover:text-gray-900 transition-colors focus-visible"
            >
              Help
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
