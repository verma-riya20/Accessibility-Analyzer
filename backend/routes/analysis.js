const express = require('express');
const router = express.Router();
const AccessibilityAnalyzer = require('../services/accessibilityAnalyzer');
const AISuggestionsService = require('../services/aiSuggestions');
const AccessibilityHeatmapService = require('../services/heatmap');
const ImageContentCheckerService = require('../services/contentChecker');

router.post('/analyze', async (req, res) => {
  try {
    const { url, includeAI = true, includeHeatmap = false, includeImageAnalysis = false } = req.body;
    
    if (!url) {
      return res.status(400).json({
        error: 'URL is required'
      });
    }

    // Validate URL format
    let validUrl;
    try {
      validUrl = new URL(url);
      if (!['http:', 'https:'].includes(validUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid URL format. Please include http:// or https://'
      });
    }

    console.log(`Starting analysis for: ${url}`);
    
    const analyzer = new AccessibilityAnalyzer();
    const results = await analyzer.analyzeUrl(url);

    // Add AI suggestions if requested
    if (includeAI) {
      console.log('Generating AI suggestions...');
      try {
        const aiService = new AISuggestionsService(); // Initialize the service
        const aiSuggestions = await aiService.generateSuggestions(results); // Use 'results' not 'analysisResults'
        results.aiSuggestions = aiSuggestions; // Add to 'results' not 'analysisResults'
      } catch (error) {
        console.error('AI suggestions failed:', error);
        results.aiSuggestions = {
          ai_suggestions: [],
          success: false,
          error: error.message
        };
      }
    }

    // Add heatmap data if requested
    if (includeHeatmap) {
      console.log('Generating accessibility heatmap...');
      results.heatmapData = { message: 'Heatmap generation requires page context' };
    }

    // Add image analysis if requested
    if (includeImageAnalysis) {
      console.log('Analyzing image content...');
      results.imageAnalysis = { message: 'Image analysis requires page context' };
    }

    res.json({
      success: true,
      url,
      timestamp: new Date().toISOString(),
      features: {
        aiSuggestions: includeAI,
        heatmap: includeHeatmap,
        imageAnalysis: includeImageAnalysis
      },
      ...results
    });

  } catch (error) {
    console.error('Enhanced analysis error:', error);
    
    let errorMessage = 'Failed to analyze webpage';
    if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
      errorMessage = 'Website not found. Please check the URL.';
    } else if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
      errorMessage = 'Connection refused. The website may be down.';
    } else if (error.message.includes('Expected')) {
      errorMessage = 'Unable to parse the webpage content. The site may have formatting issues.';
    } else if (error.message.includes('Navigation timeout')) {
      errorMessage = 'The website took too long to load. Please try again or check if the site is accessible.';
    }
    
    res.status(500).json({
      error: errorMessage,
      details: error.message
    });
  }
});

// Dedicated AI suggestions endpoint
router.post('/ai-suggestions', async (req, res) => {
  try {
    const { analysisResults } = req.body;
    
    if (!analysisResults) {
      return res.status(400).json({
        error: 'Analysis results are required'
      });
    }

    const aiService = new AISuggestionsService();
    const suggestions = await aiService.generateSuggestions(analysisResults);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      suggestions
    });
  } catch (error) {
    console.error('AI suggestions error:', error);
    res.status(500).json({
      error: 'Failed to generate AI suggestions',
      details: error.message
    });
  }
});

// ... rest of your existing code stays the same ...


// Disability-specific analysis endpoint
router.post('/analyze-disability', async (req, res) => {
  try {
    const { url, disabilityType } = req.body;
    
    if (!url) {
      return res.status(400).json({
        error: 'URL is required'
      });
    }

    // Validate disability type
    const validTypes = ['visual', 'auditory', 'motor', 'cognitive', 'all'];
    if (disabilityType && !validTypes.includes(disabilityType)) {
      return res.status(400).json({
        error: 'Invalid disability type. Must be one of: visual, auditory, motor, cognitive, all'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid URL format. Please include http:// or https://'
      });
    }

    console.log(`Starting disability-focused analysis for: ${url} (type: ${disabilityType || 'all'})`);
    
    const analyzer = new AccessibilityAnalyzer();
    const results = await analyzer.analyzeUrl(url);

    // Filter results if specific disability type requested
    if (disabilityType && disabilityType !== 'all') {
      const filteredResults = {
        ...results,
        disabilityAnalysis: {
          [disabilityType]: results.disabilityAnalysis[disabilityType]
        },
        focusedType: disabilityType
      };
      
      res.json({
        success: true,
        url,
        disabilityType,
        timestamp: new Date().toISOString(),
        ...filteredResults
      });
    } else {
      res.json({
        success: true,
        url,
        timestamp: new Date().toISOString(),
        ...results
      });
    }

  } catch (error) {
    console.error('Disability analysis error:', error);
    
    let errorMessage = 'Failed to analyze webpage for disability accessibility';
    if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
      errorMessage = 'Website not found. Please check the URL.';
    } else if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
      errorMessage = 'Connection refused. The website may be down.';
    } else if (error.message.includes('Expected')) {
      errorMessage = 'Unable to parse the webpage content. The site may have formatting issues.';
    }
    
    res.status(500).json({
      error: errorMessage,
      details: error.message
    });
  }
});

// Get accessibility resources for different disabilities
router.get('/disability-resources', (req, res) => {
  res.json({
    success: true,
    resources: {
      visual: {
        name: 'Visual Impairments',
        description: 'Includes blindness, low vision, and color blindness',
        assistiveTechnologies: [
          'Screen readers (JAWS, NVDA, VoiceOver)',
          'Screen magnifiers',
          'High contrast displays',
          'Braille displays'
        ],
        guidelines: [
          'Provide descriptive alt text for all images',
          'Use sufficient color contrast (4.5:1 minimum)',
          'Enable zoom up to 200% without horizontal scrolling',
          'Use proper heading hierarchy',
          'Provide text alternatives for visual content'
        ],
        testingMethods: [
          'Test with screen reader software',
          'Navigate without using a mouse',
          'Verify content in high contrast mode',
          'Check color contrast ratios',
          'Test zoom functionality'
        ]
      },
      auditory: {
        name: 'Auditory Impairments',
        description: 'Includes deafness and hearing loss',
        assistiveTechnologies: [
          'Closed captions',
          'Sign language interpreters',
          'Visual indicators',
          'Hearing aids with induction loops'
        ],
        guidelines: [
          'Provide captions for all video content',
          'Include transcripts for audio content',
          'Use visual alerts instead of audio-only alerts',
          'Ensure captions are accurate and synchronized'
        ],
        testingMethods: [
          'Test all functionality without sound',
          'Verify caption accuracy and timing',
          'Check for visual indicators of audio events',
          'Test with sound muted'
        ]
      },
      motor: {
        name: 'Motor Impairments',
        description: 'Includes limited fine motor control and paralysis',
        assistiveTechnologies: [
          'Switch devices',
          'Eye-tracking systems',
          'Voice control software',
          'Keyboard-only navigation',
          'Head pointers'
        ],
        guidelines: [
          'Ensure all functionality is keyboard accessible',
          'Make click targets at least 44x44 pixels',
          'Provide generous spacing between interactive elements',
          'Avoid time limits or allow extensions',
          'Support alternative input methods'
        ],
        testingMethods: [
          'Navigate using only the keyboard',
          'Test with switch device simulation',
          'Verify click target sizes',
          'Check for keyboard traps',
          'Test timeout behaviors'
        ]
      },
      cognitive: {
        name: 'Cognitive Impairments',
        description: 'Includes learning disabilities, memory issues, and attention disorders',
        assistiveTechnologies: [
          'Text-to-speech software',
          'Reading guides and overlays',
          'Content simplification tools',
          'Memory aids and bookmarks'
        ],
        guidelines: [
          'Use clear, simple language',
          'Provide help text and instructions',
          'Use consistent navigation patterns',
          'Minimize distractions and interruptions',
          'Allow users to control timing'
        ],
        testingMethods: [
          'Test with text-to-speech enabled',
          'Verify clear error messages and instructions',
          'Check for consistent design patterns',
          'Test with reduced motion preferences',
          'Verify timeout warnings and extensions'
        ]
      }
    },
    wcagGuidelines: {
      'A': {
        description: 'Minimum level of accessibility',
        keyRequirements: ['Text alternatives', 'Captions for prerecorded video', 'Keyboard accessible']
      },
      'AA': {
        description: 'Standard level for most organizations',
        keyRequirements: ['Color contrast', 'Resize text', 'Focus indicators', 'Page titles']
      },
      'AAA': {
        description: 'Enhanced level of accessibility',
        keyRequirements: ['Sign language', 'Context-sensitive help', 'Large click targets']
      }
    }
  });
});

// Get analysis history (placeholder for future database integration)
router.get('/history', (req, res) => {
  res.json({
    success: true,
    history: [],
    message: 'History feature coming soon'
  });
});

// Get WCAG guidelines information
router.get('/wcag-info', (req, res) => {
  res.json({
    success: true,
    wcag: {
      version: '2.1',
      levels: ['A', 'AA', 'AAA'],
      principles: {
        perceivable: {
          name: 'Perceivable',
          description: 'Information must be presentable in ways users can perceive',
          guidelines: ['Text alternatives', 'Time-based media', 'Adaptable', 'Distinguishable']
        },
        operable: {
          name: 'Operable',
          description: 'Interface components must be operable',
          guidelines: ['Keyboard accessible', 'No seizures', 'Navigable', 'Input methods']
        },
        understandable: {
          name: 'Understandable',
          description: 'Information and UI operation must be understandable',
          guidelines: ['Readable', 'Predictable', 'Input assistance']
        },
        robust: {
          name: 'Robust',
          description: 'Content must be robust enough for interpretation by assistive technologies',
          guidelines: ['Compatible']
        }
      }
    }
  });
});

module.exports = router;