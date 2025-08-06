import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import AnalyzerForm from './components/AnalyzerForm';
import ResultsDisplay from './components/ResultsDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import { analyzeUrl } from './services/api';

function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = async (url) => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const data = await analyzeUrl(url);
      setResults(data);
    } catch (err) {
      setError(err.message || 'Failed to analyze the webpage');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    setError(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    Web Accessibility Analyzer
                  </h1>
                  <p className="text-xl text-gray-600 mb-8">
                    Analyze websites for WCAG 2.1 AA compliance and accessibility issues
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
                  <AnalyzerForm 
                    onAnalyze={handleAnalyze} 
                    loading={loading}
                    disabled={loading}
                  />
                </div>

                {loading && (
                  <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
                    <LoadingSpinner />
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
                    <div className="flex items-center">
                      <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h3 className="text-lg font-semibold text-red-800">Analysis Failed</h3>
                        <p className="text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {results && (
                  <div className="space-y-8">
                    <ResultsDisplay results={results} onReset={handleReset} />
                  </div>
                )}
              </div>
            } />
          </Routes>
        </main>

        <footer className="bg-gray-800 text-white py-8 mt-16">
          <div className="container mx-auto px-4 text-center">
            <p className="text-gray-300">
              © 2025 Web Accessibility Analyzer. Built with accessibility in mind.
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
