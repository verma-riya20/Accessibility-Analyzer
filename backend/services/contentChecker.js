class ImageContentCheckerService {
  constructor() {
    this.imageAnalysis = {
      types: {
        informative: 'Images that convey important information',
        decorative: 'Images used for visual appeal only',
        functional: 'Images that serve as buttons or links',
        text: 'Images containing text content',
        complex: 'Charts, graphs, or detailed images'
      },
      recommendations: {}
    };
  }

  async analyzeImages(page, $) {
    try {
      console.log('Analyzing image content...');
      
      const imageData = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        
        return images.map(img => {
          const rect = img.getBoundingClientRect();
          return {
            src: img.src,
            alt: img.getAttribute('alt'),
            title: img.getAttribute('title'),
            width: img.naturalWidth || rect.width,
            height: img.naturalHeight || rect.height,
            visible: rect.width > 0 && rect.height > 0,
            loading: img.getAttribute('loading'),
            role: img.getAttribute('role'),
            ariaLabel: img.getAttribute('aria-label'),
            ariaDescribedBy: img.getAttribute('aria-describedby'),
            className: img.className,
            id: img.id,
            parent: {
              tagName: img.parentElement?.tagName,
              role: img.parentElement?.getAttribute('role'),
              href: img.parentElement?.tagName === 'A' ? img.parentElement.href : null
            },
            context: {
              nearbyText: this.getNearbyText(img),
              inLink: img.closest('a') !== null,
              inButton: img.closest('button') !== null
            }
          };
        });
      });

      const analysis = {
        total_images: imageData.length,
        categorized_images: {
          informative: [],
          decorative: [],
          functional: [],
          text_images: [],
          complex: [],
          uncategorized: []
        },
        alt_text_analysis: {
          missing_alt: [],
          empty_alt: [],
          good_alt: [],
          poor_alt: []
        },
        ai_suggestions: [],
        accessibility_score: 0
      };

      // Analyze each image
      imageData.forEach(img => {
        if (!img.visible) return; // Skip hidden images
        
        // Categorize image
        const category = this.categorizeImage(img);
        analysis.categorized_images[category].push(img);
        
        // Analyze alt text
        const altAnalysis = this.analyzeAltText(img, category);
        analysis.alt_text_analysis[altAnalysis.category].push({
          ...img,
          alt_quality: altAnalysis.quality,
          suggestions: altAnalysis.suggestions
        });
        
        // Generate AI suggestions
        const suggestions = this.generateImageSuggestions(img, category, altAnalysis);
        if (suggestions.length > 0) {
          analysis.ai_suggestions.push(...suggestions);
        }
      });

      // Calculate accessibility score
      analysis.accessibility_score = this.calculateImageAccessibilityScore(analysis);
      
      // Add overall recommendations
      analysis.overall_recommendations = this.generateOverallRecommendations(analysis);

      return analysis;
    } catch (error) {
      console.error('Error analyzing images:', error);
      return this.getEmptyImageAnalysis();
    }
  }

  categorizeImage(img) {
    // Functional images (in links or buttons)
    if (img.context.inLink || img.context.inButton || img.parent.href) {
      return 'functional';
    }
    
    // Decorative images (empty alt, role="presentation", or clearly decorative)
    if (img.alt === '' || img.role === 'presentation' || img.role === 'none') {
      return 'decorative';
    }
    
    // Text images (likely to contain text based on size and context)
    if (this.likelyContainsText(img)) {
      return 'text_images';
    }
    
    // Complex images (charts, graphs, diagrams)
    if (this.isComplexImage(img)) {
      return 'complex';
    }
    
    // Informative images (default category)
    if (img.alt && img.alt.trim().length > 0) {
      return 'informative';
    }
    
    return 'uncategorized';
  }

  likelyContainsText(img) {
    const textIndicators = [
      'logo', 'banner', 'sign', 'caption', 'title', 'text',
      'screenshot', 'interface', 'menu', 'button'
    ];
    
    const src = img.src.toLowerCase();
    const alt = (img.alt || '').toLowerCase();
    const className = (img.className || '').toLowerCase();
    
    return textIndicators.some(indicator => 
      src.includes(indicator) || alt.includes(indicator) || className.includes(indicator)
    );
  }

  isComplexImage(img) {
    const complexIndicators = [
      'chart', 'graph', 'diagram', 'map', 'infographic',
      'flowchart', 'timeline', 'data', 'visualization'
    ];
    
    const src = img.src.toLowerCase();
    const alt = (img.alt || '').toLowerCase();
    const className = (img.className || '').toLowerCase();
    
    // Also check image size - large images might be complex
    const isLarge = img.width > 400 && img.height > 300;
    
    return isLarge || complexIndicators.some(indicator => 
      src.includes(indicator) || alt.includes(indicator) || className.includes(indicator)
    );
  }

  analyzeAltText(img, category) {
    if (!img.alt) {
      return {
        category: 'missing_alt',
        quality: 0,
        suggestions: ['Add alt attribute to describe the image content and purpose']
      };
    }
    
    if (img.alt.trim() === '') {
      if (category === 'decorative') {
        return {
          category: 'good_alt',
          quality: 100,
          suggestions: []
        };
      } else {
        return {
          category: 'empty_alt',
          quality: 20,
          suggestions: ['Add descriptive alt text - empty alt should only be used for decorative images']
        };
      }
    }
    
    // Analyze alt text quality
    const quality = this.assessAltTextQuality(img.alt, category, img);
    
    if (quality.score >= 80) {
      return {
        category: 'good_alt',
        quality: quality.score,
        suggestions: quality.suggestions
      };
    } else {
      return {
        category: 'poor_alt',
        quality: quality.score,
        suggestions: quality.suggestions
      };
    }
  }

  assessAltTextQuality(altText, category, img) {
    let score = 50; // Base score
    const suggestions = [];
    
    // Length check
    if (altText.length < 5) {
      score -= 20;
      suggestions.push('Alt text is too short - provide more descriptive information');
    } else if (altText.length > 125) {
      score -= 10;
      suggestions.push('Alt text is quite long - consider if all information is necessary');
    } else {
      score += 10;
    }
    
    // Avoid redundant phrases
    const redundantPhrases = ['image of', 'picture of', 'photo of', 'graphic of'];
    if (redundantPhrases.some(phrase => altText.toLowerCase().includes(phrase))) {
      score -= 15;
      suggestions.push('Remove redundant phrases like "image of" or "picture of"');
    }
    
    // Context appropriateness
    switch (category) {
      case 'functional':
        if (!this.describesFunctionality(altText)) {
          score -= 20;
          suggestions.push('Describe the function/destination, not the image appearance');
        }
        break;
        
      case 'informative':
        if (!this.conveysInformation(altText)) {
          score -= 15;
          suggestions.push('Describe the important information the image conveys');
        }
        break;
        
      case 'complex':
        if (altText.length < 20) {
          score -= 10;
          suggestions.push('Complex images may need longer descriptions or additional explanations');
        }
        if (!img.ariaDescribedBy) {
          suggestions.push('Consider adding aria-describedby for detailed description');
        }
        break;
    }
    
    // Meaningfulness check
    if (this.isGenericAltText(altText)) {
      score -= 25;
      suggestions.push('Alt text is too generic - be more specific about image content');
    }
    
    return {
      score: Math.max(0, Math.min(100, score)),
      suggestions
    };
  }

  describesFunctionality(altText) {
    const functionalWords = [
      'click', 'button', 'link', 'navigate', 'go to', 'visit',
      'download', 'submit', 'search', 'menu', 'close', 'open'
    ];
    return functionalWords.some(word => altText.toLowerCase().includes(word));
  }

  conveysInformation(altText) {
    // Check if alt text seems to convey meaningful information
    const informationalWords = [
      'shows', 'displays', 'contains', 'illustrates', 'depicts',
      'features', 'includes', 'represents'
    ];
    return informationalWords.some(word => altText.toLowerCase().includes(word)) ||
           altText.length > 15; // Assume longer text is more informative
  }

  isGenericAltText(altText) {
    const genericTexts = [
      'image', 'photo', 'picture', 'graphic', 'icon', 'logo',
      'untitled', 'img', 'dsc', 'photo1', 'image1'
    ];
    return genericTexts.some(generic => 
      altText.toLowerCase().trim() === generic ||
      altText.toLowerCase().includes(`${generic}_`) ||
      altText.toLowerCase().includes(`${generic}1`)
    );
  }

  generateImageSuggestions(img, category, altAnalysis) {
    const suggestions = [];
    
    // Basic alt text suggestions
    if (altAnalysis.category === 'missing_alt') {
      suggestions.push({
        type: 'critical',
        issue: 'Missing alt attribute',
        suggestion: this.generateAltTextSuggestion(img, category),
        code_fix: `alt="${this.generateAltTextSuggestion(img, category)}"`,
        priority: 'high'
      });
    }
    
    if (altAnalysis.category === 'poor_alt') {
      suggestions.push({
        type: 'improvement',
        issue: 'Poor quality alt text',
        suggestion: this.generateImprovedAltText(img, category),
        code_fix: `alt="${this.generateImprovedAltText(img, category)}"`,
        priority: 'medium'
      });
    }
    
    // Category-specific suggestions
    switch (category) {
      case 'functional':
        if (!this.describesFunctionality(img.alt || '')) {
          suggestions.push({
            type: 'functional',
            issue: 'Functional image needs action description',
            suggestion: 'Describe what happens when the image is clicked',
            example: 'Instead of "arrow", use "Go to next page"',
            priority: 'high'
          });
        }
        break;
        
      case 'complex':
        if (!img.ariaDescribedBy) {
          suggestions.push({
            type: 'complex',
            issue: 'Complex image needs detailed description',
            suggestion: 'Add a detailed description elsewhere and link with aria-describedby',
            code_fix: 'aria-describedby="chart-description"',
            priority: 'medium'
          });
        }
        break;
        
      case 'text_images':
        suggestions.push({
          type: 'text',
          issue: 'Image contains text',
          suggestion: 'Include all text from the image in the alt attribute',
          note: 'Consider using actual text instead of text images when possible',
          priority: 'medium'
        });
        break;
    }
    
    return suggestions;
  }

  generateAltTextSuggestion(img, category) {
    // Generate basic alt text suggestions based on context
    const filename = img.src.split('/').pop().split('.')[0];
    
    switch (category) {
      case 'functional':
        if (img.context.inLink && img.parent.href) {
          return `Link to ${this.extractDomainFromUrl(img.parent.href)}`;
        }
        return 'Interactive element';
        
      case 'decorative':
        return ''; // Empty alt for decorative
        
      case 'text_images':
        return `Text image: ${filename.replace(/[-_]/g, ' ')}`;
        
      case 'complex':
        return `Chart or diagram: ${filename.replace(/[-_]/g, ' ')}`;
        
      default:
        return `Image: ${filename.replace(/[-_]/g, ' ')}`;
    }
  }

  generateImprovedAltText(img, category) {
    const current = img.alt || '';
    
    // Remove redundant phrases
    let improved = current.replace(/^(image of|picture of|photo of|graphic of)\s*/i, '');
    
    // Add context based on category
    switch (category) {
      case 'functional':
        if (!this.describesFunctionality(improved)) {
          improved = `Button: ${improved}`;
        }
        break;
        
      case 'informative':
        if (improved.length < 10) {
          improved = `Informative image showing ${improved}`;
        }
        break;
    }
    
    return improved || this.generateAltTextSuggestion(img, category);
  }

  extractDomainFromUrl(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return 'external page';
    }
  }

  calculateImageAccessibilityScore(analysis) {
    const total = analysis.total_images;
    if (total === 0) return 100;
    
    const good = analysis.alt_text_analysis.good_alt.length;
    const missing = analysis.alt_text_analysis.missing_alt.length;
    const poor = analysis.alt_text_analysis.poor_alt.length;
    
    // Weight the scoring
    const score = ((good * 3) + (total - missing - poor)) / (total * 3) * 100;
    return Math.round(Math.max(0, score));
  }

  generateOverallRecommendations(analysis) {
    const recommendations = [];
    
    const missingCount = analysis.alt_text_analysis.missing_alt.length;
    const poorCount = analysis.alt_text_analysis.poor_alt.length;
    const functionalCount = analysis.categorized_images.functional.length;
    const complexCount = analysis.categorized_images.complex.length;
    
    if (missingCount > 0) {
      recommendations.push({
        priority: 'high',
        type: 'missing_alt',
        message: `Add alt attributes to ${missingCount} image(s)`,
        impact: 'Screen readers cannot describe these images to users'
      });
    }
    
    if (poorCount > 0) {
      recommendations.push({
        priority: 'medium',
        type: 'improve_alt',
        message: `Improve alt text quality for ${poorCount} image(s)`,
        impact: 'Current alt text may not effectively describe image content'
      });
    }
    
    if (functionalCount > 0) {
      recommendations.push({
        priority: 'medium',
        type: 'functional_images',
        message: `Review ${functionalCount} functional image(s) to ensure they describe the action`,
        impact: 'Users may not understand what these interactive images do'
      });
    }
    
    if (complexCount > 0) {
      recommendations.push({
        priority: 'low',
        type: 'complex_images',
        message: `Consider detailed descriptions for ${complexCount} complex image(s)`,
        impact: 'Complex visual information may not be fully accessible'
      });
    }
    
    return recommendations;
  }

  getEmptyImageAnalysis() {
    return {
      total_images: 0,
      categorized_images: {
        informative: [],
        decorative: [],
        functional: [],
        text_images: [],
        complex: [],
        uncategorized: []
      },
      alt_text_analysis: {
        missing_alt: [],
        empty_alt: [],
        good_alt: [],
        poor_alt: []
      },
      ai_suggestions: [],
      accessibility_score: 100,
      overall_recommendations: []
    };
  }
}

module.exports = ImageContentCheckerService;