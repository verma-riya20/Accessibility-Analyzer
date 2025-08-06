const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

class AccessibilityAnalyzer {
  constructor() {
    this.disabilityImpacts = {
      visual: {
        name: 'Visual Impairments',
        description: 'Affects users who are blind, have low vision, or color blindness',
        checks: ['missingAltText', 'lowContrast', 'colorOnlyInformation', 'missingHeadings', 'screenReaderIssues']
      },
      auditory: {
        name: 'Auditory Impairments', 
        description: 'Affects users who are deaf or hard of hearing',
        checks: ['missingCaptions', 'noVisualIndicators', 'audioOnlyContent']
      },
      motor: {
        name: 'Motor Impairments',
        description: 'Affects users with limited fine motor control or who cannot use a mouse',
        checks: ['keyboardTraps', 'smallClickTargets', 'noKeyboardAccess', 'timeouts']
      },
      cognitive: {
        name: 'Cognitive Impairments',
        description: 'Affects users with learning disabilities, memory issues, or attention disorders',
        checks: ['complexLanguage', 'noErrorInstructions', 'autoplayingContent', 'inconsistentNavigation']
      }
    };

    this.wcagRules = {
      // Visual impairment related
      missingAltText: {
        level: 'AA',
        guideline: '1.1.1',
        description: 'Images must have alternative text',
        disabilityImpact: 'visual',
        severity: 'critical'
      },
      lowContrast: {
        level: 'AA', 
        guideline: '1.4.3',
        description: 'Text must have sufficient contrast ratio (4.5:1 for normal text)',
        disabilityImpact: 'visual',
        severity: 'critical'
      },
      colorOnlyInformation: {
        level: 'AA',
        guideline: '1.4.1', 
        description: 'Information should not be conveyed by color alone',
        disabilityImpact: 'visual',
        severity: 'high'
      },
      missingHeadingStructure: {
        level: 'AA',
        guideline: '1.3.1',
        description: 'Proper heading hierarchy must be maintained',
        disabilityImpact: 'visual',
        severity: 'high'
      },
      
      // Motor impairment related
      noKeyboardAccess: {
        level: 'AA',
        guideline: '2.1.1',
        description: 'All functionality must be keyboard accessible',
        disabilityImpact: 'motor',
        severity: 'critical'
      },
      smallClickTargets: {
        level: 'AAA',
        guideline: '2.5.5',
        description: 'Click targets should be at least 44x44 pixels',
        disabilityImpact: 'motor', 
        severity: 'medium'
      },
      keyboardTraps: {
        level: 'AA',
        guideline: '2.1.2',
        description: 'Keyboard focus must not be trapped',
        disabilityImpact: 'motor',
        severity: 'critical'
      },
      
      // Auditory impairment related  
      missingCaptions: {
        level: 'AA',
        guideline: '1.2.2',
        description: 'Videos must have captions',
        disabilityImpact: 'auditory',
        severity: 'critical'
      },
      
      // Cognitive impairment related
      complexLanguage: {
        level: 'AAA',
        guideline: '3.1.5',
        description: 'Language should be as simple as possible',
        disabilityImpact: 'cognitive',
        severity: 'medium'
      },
      autoplayingContent: {
        level: 'AA',
        guideline: '1.4.2',
        description: 'Auto-playing audio should be controllable',
        disabilityImpact: 'cognitive',
        severity: 'high'
      }
    };
  }

  async analyzeUrl(url) {
    let browser;
    try {
      // Launch Puppeteer browser with enhanced options
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-dev-shm-usage',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set user agent to avoid blocking
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      // Add error handling for page navigation
      try {
        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 15000 
        });
        
        // Wait a bit more for dynamic content
        await page.waitForTimeout(2000);
      } catch (navigationError) {
        throw new Error(`Failed to load webpage: ${navigationError.message}`);
      }
      
      // Get clean page content with error handling
      let content;
      try {
        // Remove problematic CSS and scripts that might cause parsing issues
        content = await page.evaluate(() => {
          // Remove style tags that might have malformed CSS
          const styles = document.querySelectorAll('style');
          styles.forEach(style => {
            try {
              // Check if CSS is malformed
              if (style.textContent.includes('=') && !style.textContent.includes(':')) {
                style.remove();
              }
            } catch (e) {
              style.remove();
            }
          });
          
          // Remove script tags to avoid JS parsing issues
          const scripts = document.querySelectorAll('script');
          scripts.forEach(script => script.remove());
          
          return document.documentElement.outerHTML;
        });
      } catch (contentError) {
        throw new Error(`Failed to get page content: ${contentError.message}`);
      }
      
      // Parse HTML with enhanced error handling and safer options
      let $;
      try {
        $ = cheerio.load(content, {
          xmlMode: false,
          decodeEntities: true,
          lowerCaseAttributeNames: false,
          recognizeSelfClosing: true,
          ignoreWhitespace: true,
          normalizeWhitespace: true
        });
      } catch (parseError) {
        console.warn('First parse attempt failed:', parseError.message);
        // Try to clean the content more aggressively
        try {
          const cleanContent = content
            .replace(/style\s*=\s*"[^"]*"/gi, '') // Remove inline styles
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style blocks
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
            .replace(/<!--[\s\S]*?-->/g, ''); // Remove comments
          
          $ = cheerio.load(cleanContent, {
            xmlMode: false,
            decodeEntities: true,
            lowerCaseAttributeNames: false,
            recognizeSelfClosing: true,
            ignoreWhitespace: true,
            normalizeWhitespace: true
          });
        } catch (secondParseError) {
          throw new Error(`Unable to parse webpage content: ${secondParseError.message}`);
        }
      }
      
      // Get page title with error handling
      let pageTitle;
      try {
        pageTitle = await page.title();
      } catch (titleError) {
        try {
          pageTitle = $('title').text() || 'No title found';
        } catch (cheerioTitleError) {
          pageTitle = 'No title found';
        }
      }
      
      // Initialize results structure
      const results = {
        summary: {
          totalIssues: 0,
          criticalIssues: 0,
          warningIssues: 0,
          passedChecks: 0,
          wcagLevel: 'AA',
          overallScore: 100
        },
        issues: [],
        pageInfo: {
          title: pageTitle,
          url: url,
          hasTitle: !!pageTitle && pageTitle !== 'No title found',
          hasLang: false,
          hasViewport: false
        },
        checks: {}
      };

      // Safely check page info
      try {
        results.pageInfo.hasLang = !!$('html[lang]').length;
      } catch (error) {
        console.warn('Error checking lang attribute:', error.message);
      }

      try {
        results.pageInfo.hasViewport = !!$('meta[name="viewport"]').length;
      } catch (error) {
        console.warn('Error checking viewport:', error.message);
      }

      // Perform standard accessibility checks with individual error handling
      try {
        results.checks.images = this.checkImages($);
      } catch (error) {
        console.warn('Image check failed:', error.message);
        results.checks.images = { issues: [], totalImages: 0, passed: 0 };
      }

      try {
        results.checks.headings = this.checkHeadings($);
      } catch (error) {
        console.warn('Heading check failed:', error.message);
        results.checks.headings = { issues: [], totalHeadings: 0, hasH1: false };
      }

      try {
        results.checks.forms = this.checkForms($);
      } catch (error) {
        console.warn('Form check failed:', error.message);
        results.checks.forms = { issues: [], totalInputs: 0, passed: 0 };
      }

      try {
        results.checks.links = this.checkLinks($);
      } catch (error) {
        console.warn('Link check failed:', error.message);
        results.checks.links = { issues: [], totalLinks: 0, passed: 0 };
      }

      try {
        results.checks.colors = await this.checkColors(page);
      } catch (error) {
        console.warn('Color check failed:', error.message);
        results.checks.colors = { issues: [], checked: false };
      }

      try {
        results.checks.keyboard = await this.checkKeyboardAccess(page);
      } catch (error) {
        console.warn('Keyboard check failed:', error.message);
        results.checks.keyboard = { issues: [], checked: false };
      }

      try {
        results.checks.aria = this.checkAria($);
      } catch (error) {
        console.warn('ARIA check failed:', error.message);
        results.checks.aria = { issues: [], checked: false };
      }

      try {
        results.checks.semantic = this.checkSemanticStructure($);
      } catch (error) {
        console.warn('Semantic check failed:', error.message);
        results.checks.semantic = { issues: [], hasMain: false, hasNav: false, hasHeader: false, hasFooter: false };
      }

      // Add disability-specific analysis
      try {
        results.disabilityAnalysis = await this.analyzeDisabilityImpacts($, page);
      } catch (error) {
        console.warn('Disability impact analysis failed:', error.message);
        results.disabilityAnalysis = this.getEmptyDisabilityAnalysis();
      }
      
      // Calculate summary
      this.calculateSummary(results);
      
      return results;
      
    } catch (error) {
      console.error('Analysis error:', error);
      throw new Error(`Failed to analyze URL: ${error.message}`);
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.warn('Failed to close browser:', closeError.message);
        }
      }
    }
  }

  async analyzeDisabilityImpacts($, page) {
    const analysis = {
      visual: {
        impact: 'visual',
        name: this.disabilityImpacts.visual.name,
        description: this.disabilityImpacts.visual.description,
        issues: [],
        score: 100,
        recommendations: []
      },
      auditory: {
        impact: 'auditory', 
        name: this.disabilityImpacts.auditory.name,
        description: this.disabilityImpacts.auditory.description,
        issues: [],
        score: 100,
        recommendations: []
      },
      motor: {
        impact: 'motor',
        name: this.disabilityImpacts.motor.name,
        description: this.disabilityImpacts.motor.description,
        issues: [],
        score: 100,
        recommendations: []
      },
      cognitive: {
        impact: 'cognitive',
        name: this.disabilityImpacts.cognitive.name,
        description: this.disabilityImpacts.cognitive.description,
        issues: [],
        score: 100,
        recommendations: []
      }
    };

    // Visual impairment checks
    await this.checkVisualAccessibility($, page, analysis.visual);
    
    // Auditory impairment checks
    await this.checkAuditoryAccessibility($, page, analysis.auditory);
    
    // Motor impairment checks  
    await this.checkMotorAccessibility($, page, analysis.motor);
    
    // Cognitive impairment checks
    await this.checkCognitiveAccessibility($, page, analysis.cognitive);

    return analysis;
  }

  async checkVisualAccessibility($, page, visualAnalysis) {
    try {
      // Check for screen reader support
      let ariaLandmarks = 0;
      try {
        ariaLandmarks = $('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer').length;
      } catch (error) {
        console.warn('Error checking ARIA landmarks:', error.message);
      }

      if (ariaLandmarks === 0) {
        visualAnalysis.issues.push({
          type: 'error',
          rule: 'missingLandmarks',
          message: 'Page lacks ARIA landmarks for screen reader navigation',
          impact: 'Screen reader users cannot efficiently navigate the page',
          solution: 'Add semantic HTML5 elements (main, nav, header, footer) or ARIA landmark roles',
          wcag: this.wcagRules.missingHeadingStructure
        });
        visualAnalysis.score -= 15;
      }

      // Check for focus indicators
      try {
        const focusIssues = await page.evaluate(() => {
          const focusableElements = document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          let issuesCount = 0;
          
          focusableElements.forEach(el => {
            try {
              el.focus();
              const styles = window.getComputedStyle(el, ':focus');
              if (styles.outline === 'none' && !styles.boxShadow && !styles.border.includes('focus')) {
                issuesCount++;
              }
            } catch (e) {
              // Skip elements that can't be focused
            }
          });
          
          return { total: focusableElements.length, issues: issuesCount };
        });

        if (focusIssues.issues > 0) {
          visualAnalysis.issues.push({
            type: 'warning',
            rule: 'missingFocusIndicators',
            message: `${focusIssues.issues} elements lack visible focus indicators`,
            impact: 'Keyboard users cannot see which element has focus',
            solution: 'Add visible focus styles using CSS :focus selector',
            wcag: this.wcagRules.noKeyboardAccess
          });
          visualAnalysis.score -= Math.min(20, focusIssues.issues * 2);
        }
      } catch (error) {
        console.warn('Focus indicator check failed:', error.message);
      }

      // Check text scaling
      try {
        const hasViewport = $('meta[name="viewport"]').attr('content');
        if (hasViewport && hasViewport.includes('user-scalable=no')) {
          visualAnalysis.issues.push({
            type: 'error',
            rule: 'preventZoom',
            message: 'Viewport prevents users from zooming',
            impact: 'Users with low vision cannot magnify content',
            solution: 'Remove user-scalable=no from viewport meta tag',
            wcag: this.wcagRules.lowContrast
          });
          visualAnalysis.score -= 25;
        }
      } catch (error) {
        console.warn('Viewport check failed:', error.message);
      }

      // Check for images without alt text
      try {
        const imagesWithoutAlt = $('img:not([alt])').length;
        if (imagesWithoutAlt > 0) {
          visualAnalysis.issues.push({
            type: 'error',
            rule: 'missingAltText',
            message: `${imagesWithoutAlt} images missing alt attributes`,
            impact: 'Screen reader users cannot understand image content',
            solution: 'Add descriptive alt text to all images',
            wcag: this.wcagRules.missingAltText
          });
          visualAnalysis.score -= imagesWithoutAlt * 5;
        }
      } catch (error) {
        console.warn('Alt text check failed:', error.message);
      }

      // Add recommendations
      if (visualAnalysis.score < 80) {
        visualAnalysis.recommendations.push(
          'Add descriptive alt text to all images',
          'Ensure minimum 4.5:1 contrast ratio for text',
          'Use proper heading hierarchy (h1, h2, h3, etc.)',
          'Add ARIA landmarks for better screen reader navigation',
          'Provide visible focus indicators for keyboard navigation',
          'Enable zoom functionality up to 200%'
        );
      }
    } catch (error) {
      console.warn('Visual accessibility check failed:', error.message);
    }
  }

  async checkAuditoryAccessibility($, page, auditoryAnalysis) {
    try {
      // Check for video elements
      const videos = $('video');
      if (videos.length > 0) {
        let videosWithoutCaptions = 0;
        
        videos.each((i, video) => {
          try {
            const $video = $(video);
            const hasTrack = $video.find('track[kind="captions"], track[kind="subtitles"]').length > 0;
            if (!hasTrack) {
              videosWithoutCaptions++;
            }
          } catch (error) {
            console.warn('Error checking individual video:', error.message);
          }
        });

        if (videosWithoutCaptions > 0) {
          auditoryAnalysis.issues.push({
            type: 'error',
            rule: 'missingCaptions',
            message: `${videosWithoutCaptions} video(s) lack captions`,
            impact: 'Deaf and hard of hearing users cannot access video content',
            solution: 'Add <track> elements with captions for all videos',
            wcag: this.wcagRules.missingCaptions
          });
          auditoryAnalysis.score -= videosWithoutCaptions * 20;
        }
      }

      // Check for audio elements
      const audios = $('audio[autoplay]');
      if (audios.length > 0) {
        auditoryAnalysis.issues.push({
          type: 'warning',
          rule: 'autoplayAudio',
          message: 'Auto-playing audio detected',
          impact: 'Unexpected audio can be disorienting and interfere with screen readers',
          solution: 'Remove autoplay or provide easy controls to stop audio',
          wcag: this.wcagRules.autoplayingContent
        });
        auditoryAnalysis.score -= 15;
      }

      // Check for audio-only content
      const audioElements = $('audio').length;
      if (audioElements > 0) {
        const hasTranscripts = $('[data-transcript], .transcript, #transcript').length > 0;
        if (!hasTranscripts) {
          auditoryAnalysis.issues.push({
            type: 'warning',
            rule: 'missingTranscripts',
            message: 'Audio content may lack transcripts',
            impact: 'Deaf users cannot access audio-only content',
            solution: 'Provide text transcripts for all audio content',
            wcag: this.wcagRules.missingCaptions
          });
          auditoryAnalysis.score -= 10;
        }
      }

      // Add recommendations
      if (auditoryAnalysis.score < 80) {
        auditoryAnalysis.recommendations.push(
          'Provide captions for all video content',
          'Include transcripts for audio content',
          'Use visual indicators alongside audio alerts',
          'Avoid auto-playing audio content',
          'Ensure captions are accurate and synchronized'
        );
      }
    } catch (error) {
      console.warn('Auditory accessibility check failed:', error.message);
    }
  }

  async checkMotorAccessibility($, page, motorAnalysis) {
    try {
      // Check for keyboard navigation
      try {
        const keyboardIssues = await page.evaluate(() => {
          const interactiveElements = document.querySelectorAll('button, [href], input, select, textarea, [onclick], [role="button"]');
          let nonKeyboardAccessible = 0;
          
          interactiveElements.forEach(el => {
            try {
              const tabIndex = el.getAttribute('tabindex');
              if (tabIndex === '-1' && !el.disabled) {
                nonKeyboardAccessible++;
              }
            } catch (e) {
              // Skip problematic elements
            }
          });
          
          return { total: interactiveElements.length, issues: nonKeyboardAccessible };
        });

        if (keyboardIssues.issues > 0) {
          motorAnalysis.issues.push({
            type: 'error',
            rule: 'keyboardInaccessible',
            message: `${keyboardIssues.issues} interactive elements not keyboard accessible`,
            impact: 'Users who cannot use a mouse cannot interact with these elements',
            solution: 'Remove tabindex="-1" from interactive elements or provide keyboard alternatives',
            wcag: this.wcagRules.noKeyboardAccess
          });
          motorAnalysis.score -= keyboardIssues.issues * 10;
        }
      } catch (error) {
        console.warn('Keyboard accessibility check failed:', error.message);
      }

      // Check for small click targets
      try {
        const clickTargetIssues = await page.evaluate(() => {
          const clickableElements = document.querySelectorAll('button, [href], input[type="button"], input[type="submit"], [onclick], [role="button"]');
          let smallTargets = 0;
          
          clickableElements.forEach(el => {
            try {
              const rect = el.getBoundingClientRect();
              if (rect.width < 44 || rect.height < 44) {
                smallTargets++;
              }
            } catch (e) {
              // Skip elements that can't be measured
            }
          });
          
          return { total: clickableElements.length, small: smallTargets };
        });

        if (clickTargetIssues.small > 0) {
          motorAnalysis.issues.push({
            type: 'warning',
            rule: 'smallClickTargets',
            message: `${clickTargetIssues.small} click targets smaller than 44x44 pixels`,
            impact: 'Users with motor impairments may have difficulty clicking small targets',
            solution: 'Increase padding or size of clickable elements to at least 44x44 pixels',
            wcag: this.wcagRules.smallClickTargets
          });
          motorAnalysis.score -= clickTargetIssues.small * 5;
        }
      } catch (error) {
        console.warn('Click target check failed:', error.message);
      }

      // Check for skip links
      try {
        const skipLinks = $('a[href^="#"], [role="link"][href^="#"]').filter(function() {
          return $(this).text().toLowerCase().includes('skip');
        }).length;

        if (skipLinks === 0) {
          motorAnalysis.issues.push({
            type: 'warning',
            rule: 'missingSkipLinks',
            message: 'Page lacks skip navigation links',
            impact: 'Keyboard users must tab through all navigation items',
            solution: 'Add skip links to main content and navigation sections',
            wcag: this.wcagRules.noKeyboardAccess
          });
          motorAnalysis.score -= 10;
        }
      } catch (error) {
        console.warn('Skip links check failed:', error.message);
      }

      // Add recommendations
      if (motorAnalysis.score < 80) {
        motorAnalysis.recommendations.push(
          'Ensure all interactive elements are keyboard accessible',
          'Make click targets at least 44x44 pixels',
          'Provide generous spacing between clickable elements',
          'Avoid keyboard traps',
          'Add skip links for navigation',
          'Support alternative input methods'
        );
      }
    } catch (error) {
      console.warn('Motor accessibility check failed:', error.message);
    }
  }

  async checkCognitiveAccessibility($, page, cognitiveAnalysis) {
    try {
      // Check for complex forms without help
      const forms = $('form');
      if (forms.length > 0) {
        let formsWithoutHelp = 0;
        
        forms.each((i, form) => {
          try {
            const $form = $(form);
            const hasHelp = $form.find('[role="tooltip"], .help-text, .description, [aria-describedby]').length > 0;
            const complexInputs = $form.find('input[type="email"], input[type="password"], input[type="tel"], select').length;
            
            if (complexInputs > 0 && !hasHelp) {
              formsWithoutHelp++;
            }
          } catch (error) {
            console.warn('Error checking individual form:', error.message);
          }
        });

        if (formsWithoutHelp > 0) {
          cognitiveAnalysis.issues.push({
            type: 'warning',
            rule: 'missingFormHelp',
            message: `${formsWithoutHelp} complex form(s) lack help text`,
            impact: 'Users with cognitive impairments may struggle to complete forms without guidance',
            solution: 'Add help text, examples, or instructions for form fields',
            wcag: this.wcagRules.complexLanguage
          });
          cognitiveAnalysis.score -= formsWithoutHelp * 10;
        }
      }

      // Check for session timeouts
      const hasTimeouts = $('[data-timeout], [data-session]').length > 0;
      if (hasTimeouts) {
        cognitiveAnalysis.issues.push({
          type: 'warning',
          rule: 'sessionTimeouts',
          message: 'Page may have session timeouts',
          impact: 'Users who need extra time may lose their progress',
          solution: 'Provide warnings before timeouts and allow users to extend sessions',
          wcag: this.wcagRules.autoplayingContent
        });
        cognitiveAnalysis.score -= 10;
      }

      // Check for blinking/moving content
      const blinkingElements = $('[style*="blink"], .blink, [style*="animation"]').length;
      if (blinkingElements > 0) {
        cognitiveAnalysis.issues.push({
          type: 'warning',
          rule: 'movingContent',
          message: 'Page contains blinking or animated content',
          impact: 'Can be distracting for users with attention disorders',
          solution: 'Provide controls to pause animations or reduce motion',
          wcag: this.wcagRules.autoplayingContent
        });
        cognitiveAnalysis.score -= 15;
      }

      // Check language complexity (basic check)
      try {
        const textContent = $('p, div, span').text();
        const avgWordsPerSentence = this.calculateAverageWordsPerSentence(textContent);
        if (avgWordsPerSentence > 20) {
          cognitiveAnalysis.issues.push({
            type: 'info',
            rule: 'complexLanguage',
            message: 'Text may be complex for some users',
            impact: 'Users with cognitive impairments may have difficulty understanding complex text',
            solution: 'Consider simplifying language and sentence structure',
            wcag: this.wcagRules.complexLanguage
          });
          cognitiveAnalysis.score -= 5;
        }
      } catch (error) {
        console.warn('Language complexity check failed:', error.message);
      }

      // Add recommendations
      if (cognitiveAnalysis.score < 80) {
        cognitiveAnalysis.recommendations.push(
          'Use simple, clear language',
          'Provide help text for complex forms',
          'Give users control over time limits',
          'Use consistent navigation patterns',
          'Minimize distractions and moving content',
          'Break up long content into smaller sections'
        );
      }
    } catch (error) {
      console.warn('Cognitive accessibility check failed:', error.message);
    }
  }

  calculateAverageWordsPerSentence(text) {
    try {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length === 0) return 0;
      
      const totalWords = sentences.reduce((total, sentence) => {
        return total + sentence.trim().split(/\s+/).length;
      }, 0);
      
      return totalWords / sentences.length;
    } catch (error) {
      console.warn('Error calculating sentence complexity:', error.message);
      return 0;
    }
  }

  checkImages($) {
    const issues = [];
    let totalImages = 0;
    
    try {
      const images = $('img');
      totalImages = images.length;
      
      images.each((i, img) => {
        try {
          const $img = $(img);
          const alt = $img.attr('alt');
          const src = $img.attr('src') || 'Unknown source';
          
          if (alt === undefined) {
            issues.push({
              type: 'error',
              rule: 'missingAltText',
              element: 'img',
              message: 'Image missing alt attribute',
              location: src,
              wcag: this.wcagRules.missingAltText
            });
          } else if (alt.trim() === '' && !$img.attr('role')) {
            issues.push({
              type: 'warning',
              rule: 'emptyAltText',
              element: 'img',
              message: 'Image has empty alt text - ensure this is decorative',
              location: src,
              wcag: this.wcagRules.missingAltText
            });
          }
        } catch (error) {
          console.warn('Error checking individual image:', error.message);
        }
      });
    } catch (error) {
      console.warn('Error in image check:', error.message);
    }
    
    return {
      totalImages: totalImages,
      issues: issues,
      passed: Math.max(0, totalImages - issues.filter(i => i.type === 'error').length)
    };
  }

  checkHeadings($) {
    const issues = [];
    let totalHeadings = 0;
    const headingLevels = [];
    let hasH1 = false;
    
    try {
      const headings = $('h1, h2, h3, h4, h5, h6');
      totalHeadings = headings.length;
      
      headings.each((i, heading) => {
        try {
          const level = parseInt(heading.tagName.charAt(1));
          headingLevels.push(level);
          
          if (level === 1) {
            hasH1 = true;
          }
        } catch (error) {
          console.warn('Error checking individual heading:', error.message);
        }
      });
      
      // Check for proper heading hierarchy
      for (let i = 0; i < headingLevels.length - 1; i++) {
        const current = headingLevels[i];
        const next = headingLevels[i + 1];
        
        if (next > current + 1) {
          issues.push({
            type: 'warning',
            rule: 'headingHierarchy',
            element: `h${next}`,
            message: `Heading level jumps from h${current} to h${next}`,
            wcag: this.wcagRules.missingHeadingStructure
          });
        }
      }
      
      // Check for missing h1
      if (!hasH1 && totalHeadings > 0) {
        issues.push({
          type: 'error',
          rule: 'missingH1',
          element: 'h1',
          message: 'Page missing h1 heading',
          wcag: this.wcagRules.missingHeadingStructure
        });
      }
    } catch (error) {
      console.warn('Error in heading check:', error.message);
    }
    
    return {
      totalHeadings: totalHeadings,
      hierarchy: headingLevels,
      issues: issues,
      hasH1: hasH1
    };
  }

  checkForms($) {
    const issues = [];
    let totalInputs = 0;
    
    try {
      const inputs = $('input, textarea, select');
      totalInputs = inputs.length;
      
      inputs.each((i, input) => {
        try {
          const $input = $(input);
          const type = $input.attr('type');
          
          // Skip hidden inputs
          if (type === 'hidden') return;
          
          const id = $input.attr('id');
          const ariaLabel = $input.attr('aria-label');
          const ariaLabelledBy = $input.attr('aria-labelledby');
          
          // Check for labels
          let hasLabel = false;
          if (id) {
            try {
              hasLabel = $(`label[for="${id}"]`).length > 0;
            } catch (labelError) {
              console.warn('Error checking label:', labelError.message);
            }
          }
          
          if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
            issues.push({
              type: 'error',
              rule: 'missingLabel',
              element: input.tagName ? input.tagName.toLowerCase() : 'input',
              message: 'Form control missing label',
              location: id || type || 'Unknown input',
              wcag: this.wcagRules.missingHeadingStructure
            });
          }
        } catch (error) {
          console.warn('Error checking individual form input:', error.message);
        }
      });
    } catch (error) {
      console.warn('Error in form check:', error.message);
    }
    
    return {
      totalInputs: totalInputs,
      issues: issues,
      passed: Math.max(0, totalInputs - issues.length)
    };
  }

  checkLinks($) {
    const issues = [];
    let totalLinks = 0;
    
    try {
      const links = $('a[href]');
      totalLinks = links.length;
      
      links.each((i, link) => {
        try {
          const $link = $(link);
          const href = $link.attr('href') || '';
          const text = $link.text().trim();
          const ariaLabel = $link.attr('aria-label');
          
          // Check for meaningful link text
          if (!text && !ariaLabel) {
            issues.push({
              type: 'error',
              rule: 'emptyLinkText',
              element: 'a',
              message: 'Link has no accessible text',
              location: href,
              wcag: this.wcagRules.missingHeadingStructure
            });
          } else if (text && ['click here', 'read more', 'more', 'here'].includes(text.toLowerCase())) {
            issues.push({
              type: 'warning',
              rule: 'vagueLinkText',
              element: 'a',
              message: `Link text "${text}" is not descriptive`,
              location: href,
              wcag: this.wcagRules.missingHeadingStructure
            });
          }
        } catch (error) {
          console.warn('Error checking individual link:', error.message);
        }
      });
    } catch (error) {
      console.warn('Error in link check:', error.message);
    }
    
    return {
      totalLinks: totalLinks,
      issues: issues,
      passed: Math.max(0, totalLinks - issues.filter(i => i.type === 'error').length)
    };
  }

  async checkColors(page) {
    const issues = [];
    
    try {
      // This is a simplified color contrast check
      const contrastIssues = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const issues = [];
        
        for (let el of elements) {
          try {
            const styles = window.getComputedStyle(el);
            const color = styles.color;
            const backgroundColor = styles.backgroundColor;
            
            // Simple check for very light text on light backgrounds
            if (color === 'rgb(255, 255, 255)' && backgroundColor === 'rgb(255, 255, 255)') {
              issues.push({
                type: 'error',
                message: 'White text on white background detected',
                element: el.tagName.toLowerCase()
              });
            }
          } catch (error) {
            // Skip elements that can't be checked
          }
        }
        
        return issues;
      });
      
      issues.push(...contrastIssues);
    } catch (error) {
      console.warn('Color contrast check failed:', error.message);
    }
    
    return {
      issues: issues,
      checked: true
    };
  }

  async checkKeyboardAccess(page) {
    const issues = [];
    
    try {
      // Check for keyboard traps and focus management
      const keyboardIssues = await page.evaluate(() => {
        const issues = [];
        const focusableElements = document.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        // Check if focusable elements have visible focus indicators
        for (let el of focusableElements) {
          try {
            const styles = window.getComputedStyle(el, ':focus');
            if (styles.outline === 'none' && !styles.boxShadow && !styles.border) {
              issues.push({
                type: 'warning',
                message: 'Focusable element may lack visible focus indicator',
                element: el.tagName.toLowerCase()
              });
            }
          } catch (error) {
            // Skip elements that can't be checked
          }
        }
        
        return issues;
      });
      
      issues.push(...keyboardIssues);
    } catch (error) {
      console.warn('Keyboard accessibility check failed:', error.message);
    }
    
    return {
      issues: issues,
      checked: true
    };
  }

  checkAria($) {
    const issues = [];
    
    try {
      // Check for invalid ARIA attributes
      $('*[aria-*]').each((i, el) => {
        try {
          const $el = $(el);
          const ariaRole = $el.attr('role');
          
          // Basic ARIA validation (this could be much more comprehensive)
          if (ariaRole && !['button', 'link', 'heading', 'banner', 'navigation', 'main', 'complementary', 'contentinfo'].includes(ariaRole)) {
            // This is a simplified check - in reality you'd validate against the full ARIA spec
          }
        } catch (error) {
          console.warn('Error checking individual ARIA element:', error.message);
        }
      });
    } catch (error) {
      console.warn('ARIA check failed:', error.message);
    }
    
    return {
      issues: issues,
      checked: true
    };
  }

  checkSemanticStructure($) {
    const issues = [];
    let hasMain = false;
    let hasNav = false;
    let hasHeader = false;
    let hasFooter = false;
    
    try {
      // Check for semantic HTML5 elements
      hasMain = $('main').length > 0;
      hasNav = $('nav').length > 0;
      hasHeader = $('header').length > 0;
      hasFooter = $('footer').length > 0;
      
      if (!hasMain) {
        issues.push({
          type: 'warning',
          rule: 'missingMain',
          element: 'main',
          message: 'Page lacks main landmark',
          wcag: this.wcagRules.missingHeadingStructure
        });
      }
    } catch (error) {
      console.warn('Semantic structure check failed:', error.message);
    }
    
    return {
      hasMain,
      hasNav,
      hasHeader,
      hasFooter,
      issues: issues
    };
  }

  getEmptyDisabilityAnalysis() {
    return {
      visual: { impact: 'visual', name: 'Visual Impairments', issues: [], score: 0, recommendations: [] },
      auditory: { impact: 'auditory', name: 'Auditory Impairments', issues: [], score: 0, recommendations: [] },
      motor: { impact: 'motor', name: 'Motor Impairments', issues: [], score: 0, recommendations: [] },
      cognitive: { impact: 'cognitive', name: 'Cognitive Impairments', issues: [], score: 0, recommendations: [] }
    };
  }

  calculateSummary(results) {
    let totalIssues = 0;
    let criticalIssues = 0;
    let warningIssues = 0;
    let passedChecks = 0;
    
    try {
      // Count issues from all checks
      Object.values(results.checks).forEach(check => {
        if (check.issues) {
          totalIssues += check.issues.length;
          criticalIssues += check.issues.filter(i => i.type === 'error').length;
          warningIssues += check.issues.filter(i => i.type === 'warning').length;
          results.issues.push(...check.issues);
        }
        if (check.passed !== undefined) {
          passedChecks += check.passed;
        }
      });

      // Add disability analysis issues
      if (results.disabilityAnalysis) {
        Object.values(results.disabilityAnalysis).forEach(analysis => {
          if (analysis.issues) {
            analysis.issues.forEach(issue => {
              if (issue.type === 'error') criticalIssues++;
              else if (issue.type === 'warning') warningIssues++;
              totalIssues++;
            });
            results.issues.push(...analysis.issues);
          }
        });
      }
      
      // Calculate overall score
      const overallScore = Math.max(0, 100 - (criticalIssues * 10 + warningIssues * 5));
      
      results.summary = {
        totalIssues,
        criticalIssues,
        warningIssues,
        passedChecks,
        wcagLevel: criticalIssues === 0 ? 'AA' : 'Non-compliant',
        overallScore
      };
    } catch (error) {
      console.warn('Error calculating summary:', error.message);
      results.summary = {
        totalIssues: 0,
        criticalIssues: 0,
        warningIssues: 0,
        passedChecks: 0,
        wcagLevel: 'Unknown',
        overallScore: 0
      };
    }
  }
}

module.exports = AccessibilityAnalyzer;