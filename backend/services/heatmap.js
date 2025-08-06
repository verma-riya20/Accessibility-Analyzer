class AccessibilityHeatmapService {
  constructor() {
    this.heatmapData = {
      elements: [],
      zones: {},
      severityLevels: {
        critical: { color: '#dc3545', weight: 4 },
        high: { color: '#fd7e14', weight: 3 },
        medium: { color: '#ffc107', weight: 2 },
        low: { color: '#28a745', weight: 1 }
      }
    };
  }

  async generateHeatmap(page, analysisResults) {
    try {
      console.log('Generating accessibility heatmap...');
      
      const heatmapData = await page.evaluate((results) => {
        const elements = [];
        const zones = {};
        
        // Helper function to get element selector
        function getElementSelector(element) {
          if (element.id) return `#${element.id}`;
          if (element.className) return `.${element.className.split(' ')[0]}`;
          return element.tagName.toLowerCase();
        }
        
        // Helper function to get element position and size
        function getElementBounds(element) {
          const rect = element.getBoundingClientRect();
          return {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height,
            visible: rect.width > 0 && rect.height > 0
          };
        }
        
        // Map issues to DOM elements
        const issueElements = new Map();
        
        // Process image issues
        if (results.checks?.images?.issues) {
          results.checks.images.issues.forEach(issue => {
            const images = document.querySelectorAll('img');
            images.forEach(img => {
              if (img.src === issue.location || !img.getAttribute('alt')) {
                const bounds = getElementBounds(img);
                if (bounds.visible) {
                  elements.push({
                    type: 'image',
                    selector: getElementSelector(img),
                    issue: issue.rule,
                    severity: issue.type === 'error' ? 'critical' : 'medium',
                    message: issue.message,
                    bounds: bounds,
                    element: 'img'
                  });
                }
              }
            });
          });
        }
        
        // Process form issues
        if (results.checks?.forms?.issues) {
          results.checks.forms.issues.forEach(issue => {
            const inputs = document.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
              if (input.type !== 'hidden') {
                const id = input.id;
                const hasLabel = id ? document.querySelector(`label[for="${id}"]`) : null;
                
                if (!hasLabel && !input.getAttribute('aria-label')) {
                  const bounds = getElementBounds(input);
                  if (bounds.visible) {
                    elements.push({
                      type: 'form',
                      selector: getElementSelector(input),
                      issue: 'missingLabel',
                      severity: 'critical',
                      message: 'Form control missing label',
                      bounds: bounds,
                      element: input.tagName.toLowerCase()
                    });
                  }
                }
              }
            });
          });
        }
        
        // Process heading issues
        if (results.checks?.headings?.issues) {
          results.checks.headings.issues.forEach(issue => {
            if (issue.rule === 'missingH1') {
              // Mark the entire page header area
              const header = document.querySelector('header, .header, #header');
              if (header) {
                const bounds = getElementBounds(header);
                elements.push({
                  type: 'heading',
                  selector: getElementSelector(header),
                  issue: 'missingH1',
                  severity: 'high',
                  message: 'Page missing h1 heading',
                  bounds: bounds,
                  element: 'header'
                });
              }
            } else {
              // Find headings with hierarchy issues
              const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
              headings.forEach(heading => {
                const bounds = getElementBounds(heading);
                if (bounds.visible) {
                  elements.push({
                    type: 'heading',
                    selector: getElementSelector(heading),
                    issue: 'headingHierarchy',
                    severity: 'medium',
                    message: 'Heading hierarchy issue',
                    bounds: bounds,
                    element: heading.tagName.toLowerCase()
                  });
                }
              });
            }
          });
        }
        
        // Process link issues
        if (results.checks?.links?.issues) {
          results.checks.links.issues.forEach(issue => {
            const links = document.querySelectorAll('a[href]');
            links.forEach(link => {
              const text = link.textContent.trim();
              const hasIssue = (
                (issue.rule === 'emptyLinkText' && !text && !link.getAttribute('aria-label')) ||
                (issue.rule === 'vagueLinkText' && ['click here', 'read more', 'more', 'here'].includes(text.toLowerCase()))
              );
              
              if (hasIssue) {
                const bounds = getElementBounds(link);
                if (bounds.visible) {
                  elements.push({
                    type: 'link',
                    selector: getElementSelector(link),
                    issue: issue.rule,
                    severity: issue.type === 'error' ? 'critical' : 'medium',
                    message: issue.message,
                    bounds: bounds,
                    element: 'a'
                  });
                }
              }
            });
          });
        }
        
        // Process keyboard accessibility issues
        const focusableElements = document.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        focusableElements.forEach(el => {
          const tabIndex = el.getAttribute('tabindex');
          if (tabIndex === '-1' && !el.disabled) {
            const bounds = getElementBounds(el);
            if (bounds.visible) {
              elements.push({
                type: 'keyboard',
                selector: getElementSelector(el),
                issue: 'keyboardInaccessible',
                severity: 'critical',
                message: 'Element not keyboard accessible',
                bounds: bounds,
                element: el.tagName.toLowerCase()
              });
            }
          }
        });
        
        // Create zones based on page regions
        const pageRegions = {
          header: document.querySelector('header, .header, #header'),
          nav: document.querySelector('nav, .nav, #nav'),
          main: document.querySelector('main, .main, #main, .content'),
          footer: document.querySelector('footer, .footer, #footer')
        };
        
        Object.entries(pageRegions).forEach(([regionName, element]) => {
          if (element) {
            const bounds = getElementBounds(element);
            const regionElements = elements.filter(el => 
              el.bounds.x >= bounds.x && 
              el.bounds.x <= bounds.x + bounds.width &&
              el.bounds.y >= bounds.y && 
              el.bounds.y <= bounds.y + bounds.height
            );
            
            zones[regionName] = {
              bounds: bounds,
              issueCount: regionElements.length,
              severity: this.calculateZoneSeverity(regionElements),
              issues: regionElements
            };
          }
        });
        
        return { elements, zones };
      }, analysisResults);
      
      return this.processHeatmapData(heatmapData);
    } catch (error) {
      console.error('Error generating heatmap:', error);
      return this.getEmptyHeatmap();
    }
  }

  processHeatmapData(rawData) {
    const processed = {
      elements: rawData.elements || [],
      zones: rawData.zones || {},
      summary: {
        totalIssues: rawData.elements?.length || 0,
        criticalAreas: 0,
        mostProblematicZone: null,
        heatmapScore: 0
      },
      visualData: {
        coordinates: [],
        severityMap: {},
        colorScheme: this.severityLevels
      }
    };

    // Process elements for visualization
    processed.elements.forEach(element => {
      processed.visualData.coordinates.push({
        x: element.bounds.x,
        y: element.bounds.y,
        width: element.bounds.width,
        height: element.bounds.height,
        severity: element.severity,
        color: this.severityLevels[element.severity]?.color || '#6c757d',
        weight: this.severityLevels[element.severity]?.weight || 1,
        tooltip: `${element.message} (${element.element})`
      });
    });

    // Calculate zone statistics
    let maxIssues = 0;
    Object.entries(processed.zones).forEach(([zoneName, zone]) => {
      if (zone.issueCount > maxIssues) {
        maxIssues = zone.issueCount;
        processed.summary.mostProblematicZone = zoneName;
      }
      
      if (zone.issueCount >= 3) {
        processed.summary.criticalAreas++;
      }
    });

    // Calculate overall heatmap score (0-100, where 100 is best)
    const totalElements = processed.elements.length;
    if (totalElements === 0) {
      processed.summary.heatmapScore = 100;
    } else {
      const criticalIssues = processed.elements.filter(el => el.severity === 'critical').length;
      const highIssues = processed.elements.filter(el => el.severity === 'high').length;
      const mediumIssues = processed.elements.filter(el => el.severity === 'medium').length;
      
      const weightedScore = (criticalIssues * 4) + (highIssues * 3) + (mediumIssues * 2);
      processed.summary.heatmapScore = Math.max(0, 100 - (weightedScore * 2));
    }

    return processed;
  }

  calculateZoneSeverity(elements) {
    if (elements.length === 0) return 'good';
    
    const criticalCount = elements.filter(el => el.severity === 'critical').length;
    const highCount = elements.filter(el => el.severity === 'high').length;
    
    if (criticalCount > 0) return 'critical';
    if (highCount > 0) return 'high';
    if (elements.length > 2) return 'medium';
    return 'low';
  }

  generateHeatmapVisualization(heatmapData) {
    // Generate CSS for heatmap overlay
    const overlayCSS = `
      .accessibility-heatmap {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10000;
      }
      
      .heatmap-element {
        position: absolute;
        border: 2px solid;
        opacity: 0.7;
        pointer-events: auto;
        cursor: help;
      }
      
      .heatmap-critical {
        border-color: ${this.severityLevels.critical.color};
        background-color: ${this.severityLevels.critical.color}33;
      }
      
      .heatmap-high {
        border-color: ${this.severityLevels.high.color};
        background-color: ${this.severityLevels.high.color}33;
      }
      
      .heatmap-medium {
        border-color: ${this.severityLevels.medium.color};
        background-color: ${this.severityLevels.medium.color}33;
      }
      
      .heatmap-low {
        border-color: ${this.severityLevels.low.color};
        background-color: ${this.severityLevels.low.color}33;
      }
      
      .heatmap-tooltip {
        position: absolute;
        background: #333;
        color: white;
        padding: 8px;
        border-radius: 4px;
        font-size: 12px;
        max-width: 200px;
        z-index: 10001;
        display: none;
      }
    `;

    // Generate HTML for heatmap elements
    const heatmapHTML = heatmapData.visualData.coordinates.map((coord, index) => `
      <div class="heatmap-element heatmap-${coord.severity}" 
           style="left: ${coord.x}px; top: ${coord.y}px; width: ${coord.width}px; height: ${coord.height}px;"
           data-tooltip="${coord.tooltip}"
           data-index="${index}">
      </div>
    `).join('');

    return {
      css: overlayCSS,
      html: `
        <div class="accessibility-heatmap">
          ${heatmapHTML}
          <div class="heatmap-tooltip" id="heatmap-tooltip"></div>
        </div>
      `,
      script: `
        document.querySelectorAll('.heatmap-element').forEach(element => {
          element.addEventListener('mouseenter', function(e) {
            const tooltip = document.getElementById('heatmap-tooltip');
            tooltip.textContent = this.dataset.tooltip;
            tooltip.style.display = 'block';
            tooltip.style.left = e.pageX + 10 + 'px';
            tooltip.style.top = e.pageY + 10 + 'px';
          });
          
          element.addEventListener('mouseleave', function() {
            document.getElementById('heatmap-tooltip').style.display = 'none';
          });
        });
      `
    };
  }

  getEmptyHeatmap() {
    return {
      elements: [],
      zones: {},
      summary: {
        totalIssues: 0,
        criticalAreas: 0,
        mostProblematicZone: null,
        heatmapScore: 100
      },
      visualData: {
        coordinates: [],
        severityMap: {},
        colorScheme: this.severityLevels
      }
    };
  }
}

module.exports = AccessibilityHeatmapService;