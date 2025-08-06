import React, { useState } from 'react';

const AnalyzerForm = ({ onAnalyze, loading, disabled }) => {
  const [url, setUrl] = useState('');
  const [errors, setErrors] = useState({});
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const validateUrl = (url) => {
    const errors = {};
    if (!url.trim()) {
      errors.url = 'URL is required';
      return errors;
    }
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        errors.url = 'URL must use HTTP or HTTPS protocol';
      }
    } catch {
      errors.url = 'Please enter a valid URL';
    }
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateUrl(url);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      onAnalyze(url);
    }
  };

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    if (errors.url) setErrors({});
  };

 const getAISuggestions = async () => {
  setAiLoading(true);
  setAiError('');
  setAiSuggestions(null);

  try {
    const validationErrors = validateUrl(url);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setAiError('Please enter a valid URL before getting AI suggestions');
      setAiLoading(false);
      return;
    }

    console.log('Getting AI suggestions for URL:', url);

    // Create an AbortController for the timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60-second timeout

    try {
      // Make a single request that includes AI suggestions
      const response = await fetch('http://localhost:3001/api/analysis/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url.trim(),
          includeAI: true  // Tell the server to include AI suggestions
        }),
        signal: controller.signal  // Add the abort signal
      });

      clearTimeout(timeoutId); // Clear the timeout if request completes

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = 'Failed to analyze website';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Received data with AI:', data);
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Invalid data received');
      }
      
      // Check for AI suggestions in the response structure
      if (data.aiSuggestions && data.aiSuggestions.ai_suggestions) {
        setAiSuggestions(data.aiSuggestions.ai_suggestions);
      } else if (data.aiSuggestions && data.aiSuggestions.suggestions) {
        setAiSuggestions(data.aiSuggestions.suggestions);
      } else if (data.ai_suggestions) {
        setAiSuggestions(data.ai_suggestions);
      } else {
        setAiSuggestions([]);
        setAiError('No AI suggestions found in the response');
      }
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timed out. The analysis is taking too long - try a simpler website.');
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('AI Suggestion Error:', error);
    setAiError(error.message || 'Could not fetch suggestions. Please try again.');
  } finally {
    setAiLoading(false);
  }
};
  const sampleUrls = [
    'https://www.w3.org/',
    'https://webaim.org/',
    'https://www.accessibility.com/',
    'https://example.com'
  ];

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 mb-2">
            Website URL to Analyze
          </label>
          <div className="relative">
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={handleUrlChange}
              placeholder="https://example.com"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                errors.url ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
              }`}
              disabled={disabled}
              aria-describedby={errors.url ? "url-error" : "url-help"}
              aria-invalid={!!errors.url}
            />
            {errors.url && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
          </div>
          {errors.url ? (
            <p id="url-error" className="mt-2 text-sm text-red-600" role="alert">
              {errors.url}
            </p>
          ) : (
            <p id="url-help" className="mt-2 text-sm text-gray-500">
              Enter the complete URL including http:// or https://
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            disabled={disabled || !url.trim()}
            className="flex-1 bg-primary-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
  className="opacity-75"
  fill="currentColor"
  d="M12 2a10 10 0 100 20 10 10 0 000-20z"
/>

                </svg>
                Analyzing...
              </span>
            ) : (
              'Analyze Website'
            )}
          </button>

          <button
            type="button"
            onClick={getAISuggestions}
            disabled={disabled || !url.trim() || aiLoading}
            className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {aiLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
  className="opacity-75"
  fill="currentColor"
  d="M12 2a10 10 0 100 20 10 10 0 000-20z"
/>

                </svg>
                Getting Suggestions...
              </span>
            ) : (
              'Get AI Suggestions'
            )}
          </button>

          {url && !loading && (
            <button
              type="button"
              onClick={() => {
                setUrl('');
                setErrors({});
                setAiSuggestions(null);
                setAiError('');
              }}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </form>
{/* AI Suggestions */}
{aiSuggestions && (
  <div className="mt-8 p-4 bg-white shadow rounded-lg">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-semibold text-gray-800">🤖 AI Suggestions</h3>
      <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">Powered by Gemini AI</span>
    </div>
    
    {Array.isArray(aiSuggestions) && aiSuggestions.length > 0 ? (
      <div className="space-y-6">
       {/* Overall assessment first if available */}
{aiSuggestions.map((suggestion, index) => {
  if (!suggestion.is_overall) return null;
  
  return (
    <div key={`overall-${index}`} className="p-6 border border-indigo-200 rounded-lg bg-indigo-50">
      <h4 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b border-indigo-200">
        {suggestion.issue_type}
      </h4>
      <div className="prose prose-sm max-w-none">
        {(() => {
          const text = suggestion.ai_suggestion.trim();
          
          // Split the text into paragraphs
          const paragraphs = text.split('\n\n');
          
          // Find the intro paragraph (usually the first one with the score)
          const introParagraph = paragraphs.find(p => 
            p.includes('Accessibility Score:') || 
            p.includes('score') || 
            p.includes('website has')
          ) || paragraphs[0];
          
          // Find numbered recommendations
          const numberedItems = [];
          const numberedPattern = /(\d+\.)\s*(.+?)(?=\d+\.|$)/gs;
          let match;
          
          while ((match = numberedPattern.exec(text)) !== null) {
            if (match[2] && match[2].trim().length > 5) { // Only if there's actual content
              numberedItems.push({
                number: match[1],
                content: match[2].trim()
              });
            }
          }
          
          // If no proper numbered items found, try splitting by line breaks
          if (numberedItems.length === 0) {
            const lines = text.split('\n').filter(line => line.trim());
            lines.forEach(line => {
              const match = line.match(/^(\d+\.)\s*(.+)/);
              if (match && match[2] && match[2].trim().length > 5) {
                numberedItems.push({
                  number: match[1],
                  content: match[2].trim()
                });
              }
            });
          }
          
          return (
            <>
              {introParagraph && (
                <p className="mb-6 text-gray-700 text-base leading-relaxed">
                  {introParagraph.trim()}
                </p>
              )}
              
              {numberedItems.length > 0 ? (
                <div className="space-y-4">
                  {numberedItems.map((item, i) => (
                    <div key={i} className="flex items-start">
                      <span className="font-bold text-indigo-700 mr-3 mt-1 text-lg">
                        {item.number}
                      </span>
                      <p className="text-gray-700 flex-1 leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                // Fallback: display the full text if parsing fails
                <div className="text-gray-700 whitespace-pre-line">
                  {text.replace(introParagraph || '', '').trim()}
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
})}
      </div>
    ) : (
      <p className="text-gray-600">No suggestions available for this URL.</p>
    )}
  </div>
)}
      {/* Sample URLs */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Try these sample websites:
        </h3>
        <div className="flex flex-wrap gap-2">
          {sampleUrls.map((sampleUrl) => (
            <button
              key={sampleUrl}
              type="button"
              onClick={() => setUrl(sampleUrl)}
              disabled={loading}
              className="px-3 py-1 text-sm bg-white border border-gray-200 rounded-md text-gray-600 hover:bg-gray-100 hover:border-gray-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sampleUrl.replace('https://', '').replace('www.', '')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyzerForm;
