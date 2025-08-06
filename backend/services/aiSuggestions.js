const { GoogleGenAI } = require('@google/genai');

class AISuggestionsService {
  constructor() {
    // Initialize Gemini AI with new SDK
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (this.geminiApiKey) {
      this.genAI = new GoogleGenAI(this.geminiApiKey);
      this.modelName = "gemini-2.5-flash";
      console.log(`🤖 Gemini AI Service initialized with ${this.modelName} ✅`);
    } else {
      console.log('⚠️ No Gemini API key found');
    }
    
    console.log('API Key available:', this.geminiApiKey ? 'Yes ✅' : 'No ❌');
  }

  async generateSuggestions(analysisResults) {
    console.log('🔄 Starting AI suggestions generation...');
    
    if (!this.geminiApiKey) {
      console.log('❌ No Gemini API key - returning empty results');
      return {
        ai_suggestions: [],
        success: false,
        error: 'No Gemini API key provided'
      };
    }

    try {
      const allIssues = this.extractAllIssues(analysisResults);
      console.log(`📋 Found ${allIssues.length} issues to process`);
      
      if (allIssues.length === 0) {
        return {
          ai_suggestions: [],
          success: true,
          message: 'No issues found to process'
        };
      }

      // Process top issues with Gemini AI
      const topIssues = allIssues.slice(0, 5);
      const aiSuggestions = [];

      for (let i = 0; i < topIssues.length; i++) {
        const issue = topIssues[i];
        console.log(`🔍 Processing issue ${i + 1}: ${issue.rule || issue.type}`);
        
        try {
          const suggestion = await this.getGeminiSuggestion(issue);
          if (suggestion) {
            aiSuggestions.push(suggestion);
            console.log(`✅ Got Gemini suggestion for: ${issue.rule || issue.type}`);
          }
        } catch (error) {
          console.error(`❌ Gemini failed for ${issue.rule || issue.type}:`, error.message);
          // Add fallback suggestion
          aiSuggestions.push(this.getFallbackSuggestion(issue));
        }
        
        // Small delay between requests
        if (i < topIssues.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Remove duplicate suggestions based on issue_type
      const uniqueSuggestions = [];
      const seenTypes = new Set();
      
      for (const suggestion of aiSuggestions) {
        const key = suggestion.issue_type?.toLowerCase();
        if (key && !seenTypes.has(key)) {
          seenTypes.add(key);
          uniqueSuggestions.push(suggestion);
        }
      }

      // Add an overall summary suggestion if we have multiple issues
      if (uniqueSuggestions.length > 1) {
        try {
          const overallSuggestion = await this.generateOverallSuggestion(analysisResults, uniqueSuggestions);
          uniqueSuggestions.unshift(overallSuggestion); // Add to the beginning
        } catch (error) {
          console.error('Failed to generate overall suggestion:', error);
        }
      }

      return {
        ai_suggestions: uniqueSuggestions,
        success: true,
        total_processed: topIssues.length,
        suggestions_generated: uniqueSuggestions.length,
        ai_provider: 'gemini',
        model_used: this.modelName
      };

    } catch (error) {
      console.error('❌ Error in generateSuggestions:', error);
      return {
        ai_suggestions: [],
        success: false,
        error: error.message
      };
    }
  }

  async generateOverallSuggestion(analysisResults, existingSuggestions) {
    try {
      const issueTypes = existingSuggestions
        .map(s => s.issue_type)
        .filter(Boolean)
        .join(', ');

      let totalIssues = 0;
      let criticalIssues = 0;
      
      // Try to extract meaningful numbers from the analysis
      if (analysisResults.summary) {
        totalIssues = analysisResults.summary.total || 0;
        criticalIssues = analysisResults.summary.critical || 0;
      } else if (analysisResults.violations) {
        totalIssues = analysisResults.violations.length;
        criticalIssues = analysisResults.violations.filter(v => v.impact === 'critical').length;
      } else {
        // Count from existing suggestions
        totalIssues = existingSuggestions.length;
        criticalIssues = existingSuggestions.filter(s => s.priority === 'high').length;
      }
      
      // Calculate accessibility score
      const allIssues = this.extractAllIssues(analysisResults);
      const scoreData = this.calculateAccessibilityScore(analysisResults, allIssues);
      
      const prompt = `
You are an accessibility expert reviewing a website. Here are the key findings:

WEBSITE ANALYSIS:
- Accessibility Score: ${scoreData.score}/100 (${scoreData.grade})
- Total accessibility issues found: ${totalIssues}
- Critical/high priority issues: ${criticalIssues}
- Issue types detected: ${issueTypes}

Please provide a comprehensive accessibility assessment with the following structure:

Start with a summary mentioning the ${scoreData.score}/100 score and ${scoreData.grade} rating.
Then provide 4 specific, actionable recommendations to improve this website's accessibility.

Write in clear, professional language.
Do not use markdown formatting or asterisks.
Number your recommendations clearly as 1., 2., 3., 4.
Focus on strategic improvements that will have the biggest impact.
`;

      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().replace(/\*\*/g, '').trim();
      
      // Clean up the response to ensure proper formatting
      text = text
        .replace(/```/g, '')
        .replace(/\*\*/g, '')
        .replace(/^\s*Assessment:|^\s*Summary:/gmi, '')
        .trim();
      
      console.log('📝 Overall suggestion generated:', text.substring(0, 200) + '...');
      
      return {
        issue_type: "Overall Accessibility Assessment",
        ai_suggestion: text,
        priority: "high",
        estimated_fix_time: "Varies based on complexity",
        is_overall: true
      };
    } catch (error) {
      console.error('Failed to generate overall suggestion:', error);
      
      // Enhanced fallback with actual data
      const totalIssues = existingSuggestions.length;
      const criticalIssues = existingSuggestions.filter(s => s.priority === 'high').length;
      
      // Calculate score for fallback too
      const allIssues = this.extractAllIssues(analysisResults);
      const scoreData = this.calculateAccessibilityScore(analysisResults, allIssues);
      
      return {
        issue_type: "Overall Accessibility Assessment",
        ai_suggestion: `
Accessibility Score: ${scoreData.score}/100 (${scoreData.grade}) - This website has ${totalIssues} accessibility issues, with ${criticalIssues} requiring immediate attention.

1. Address critical accessibility barriers first, particularly missing alt text and form labels, as these prevent users with disabilities from accessing essential content.

2. Implement automated accessibility testing in your development workflow using tools like axe-core to catch issues before they reach production.

3. Establish accessibility guidelines for your team, including WCAG 2.1 AA compliance standards, and provide training on accessible design and development practices.

4. Conduct regular accessibility audits and user testing with people who use assistive technologies to ensure real-world usability and identify issues that automated tools might miss.

Improving accessibility is an ongoing process that benefits all users and ensures legal compliance with accessibility regulations.`,
        priority: "high",
        estimated_fix_time: "Ongoing process",
        is_overall: true
      };
    }
  }

  async getGeminiSuggestion(issue) {
    try {
      console.log(`🤖 Asking Gemini AI about: ${issue.rule || issue.type}`);
      
      const prompt = this.buildGeminiPrompt(issue);
      console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);
      
      // Use the correct API format with the genAI object
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log(`📥 Gemini response: ${text.substring(0, 100)}...`);
      
      // Process the response to ensure proper formatting
      const cleanedResponse = text
        .replace(/^\s*Problem:|^\s*Issue:|^\s*Solution:/gmi, '') // Remove unnecessary headers
        .replace(/\*\*/g, '')  // Remove markdown bold
        .replace(/```/g, '')   // Remove code block markers
        .trim();
      
      return {
        issue_type: issue.rule || issue.type || 'Accessibility Issue',
        issue_message: issue.message,
        ai_suggestion: cleanedResponse,
        priority: this.getPriority(issue.rule || issue.type),
        estimated_fix_time: this.getEstimatedTime(issue.rule || issue.type)
      };
      
    } catch (error) {
      console.error(`🚨 Gemini API Error:`, error.message);
      return this.getFallbackSuggestion(issue);
    }
  }

  buildGeminiPrompt(issue) {
    const basePrompt = `
Analyze the following accessibility issue and provide a clear, structured solution:

ISSUE TYPE: ${issue.rule || issue.type || 'Unknown Issue'}
ISSUE MESSAGE: ${issue.message || 'No message provided'}
ISSUE CONTEXT: ${issue.context || issue.html || 'No context provided'}

Please provide:
1. A clear explanation of why this is an accessibility problem (1 sentence)
2. A step-by-step solution with 3 specific steps
3. A code example showing the fix

Format your response as follows:
- Start with a concise explanation of the accessibility barrier
- Number each step clearly (1., 2., 3.)
- Make each step actionable and specific
- Provide clean code examples without markdown formatting

Do not use asterisks (**) or other markdown formatting.
Avoid phrases like "Based on the issue provided" or repeating the issue details.
Be direct, clear, and focused on practical solutions.
`;

    return basePrompt;
  }

  getFallbackSuggestion(issue) {
    const issueType = issue.rule || issue.type || 'Accessibility Issue';
    let fallbackText = '';
    
    // Provide fallback suggestions based on common issue types
    switch ((issueType || '').toLowerCase()) {
      case 'emptyalttext':
      case 'missingalttext':
      case 'alt':
        fallbackText = `
Images with empty alt text create accessibility barriers. 

1. Add descriptive alt text to explain the image's purpose and content.
2. Keep descriptions concise (under 125 characters) and focus on the information conveyed.
3. Example: <img src="chart.png" alt="Bar chart showing quarterly sales growth of 15%">`;
        break;
        
      case 'missinglabel':
      case 'label':
        fallbackText = `
Form fields without labels are not accessible to screen reader users.

1. Add a proper label element associated with the input field.
2. Use the 'for' attribute to match the input's 'id'.
3. Example: <label for="name">Full Name</label><input id="name" type="text">`;
        break;
        
      case 'lowcontrast':
      case 'contrast':
        fallbackText = `
Low contrast text is difficult to read for users with visual impairments.

1. Increase the contrast ratio between text and background to at least 4.5:1.
2. Use darker text colors on light backgrounds or lighter text on dark backgrounds.
3. Use a contrast checker tool to verify your color combinations meet WCAG standards.`;
        break;
        
      default:
        fallbackText = `
This accessibility issue needs to be addressed to ensure all users can access your content.

1. Review the specific error message and location in your code.
2. Consult the WCAG guidelines for the specific requirement.
3. Test your fix with assistive technologies to ensure it resolves the issue.`;
    }
    
    return {
      issue_type: issueType,
      issue_message: issue.message || `Accessibility issue detected`,
      ai_suggestion: fallbackText,
      priority: this.getPriority(issueType),
      estimated_fix_time: this.getEstimatedTime(issueType),
      is_fallback: true
    };
  }

  getPriority(issueType) {
    if (!issueType) return 'medium';
    
    const highPriority = ['missingalttext', 'emptyalttext', 'missinglabel', 'lowcontrast', 'aria', 'heading'];
    const normalizedType = (issueType || '').toLowerCase();
    
    for (const priority of highPriority) {
      if (normalizedType.includes(priority)) {
        return 'high';
      }
    }
    
    return 'medium';
  }

  getEstimatedTime(issueType) {
    if (!issueType) return '10-15 minutes';
    
    const normalizedType = (issueType || '').toLowerCase();
    const timeMap = {
      'missingalttext': '5-10 minutes',
      'emptyalttext': '3-7 minutes',
      'missinglabel': '2-5 minutes',
      'lowcontrast': '15-30 minutes',
      'keyboardinaccessible': '20-45 minutes',
      'missingheadingstructure': '30-60 minutes',
      'aria': '10-20 minutes',
      'landmark': '15-25 minutes'
    };
    
    // Check for partial matches
    for (const [key, time] of Object.entries(timeMap)) {
      if (normalizedType.includes(key)) {
        return time;
      }
    }
    
    return '10-15 minutes';
  }

  calculateAccessibilityScore(analysisResults, totalIssues) {
    let score = 100;
    
    // Deduct points based on issues
    const criticalIssues = totalIssues.filter(issue => 
      issue.impact === 'critical' || this.getPriority(issue.rule || issue.type) === 'high'
    ).length;
    
    const seriousIssues = totalIssues.filter(issue => 
      issue.impact === 'serious'
    ).length;
    
    const moderateIssues = totalIssues.filter(issue => 
      issue.impact === 'moderate'
    ).length;
    
    // Scoring system
    score -= criticalIssues * 15;  // -15 points per critical issue
    score -= seriousIssues * 10;   // -10 points per serious issue
    score -= moderateIssues * 5;   // -5 points per moderate issue
    
    score = Math.max(0, score); // Don't go below 0
    
    let grade = 'Excellent';
    if (score < 60) grade = 'Poor';
    else if (score < 75) grade = 'Fair';
    else if (score < 90) grade = 'Good';
    
    return { score, grade };
  }

  extractAllIssues(results) {
    const issues = [];
    
    try {
      // Extract from accessibility checks
      if (results.checks && typeof results.checks === 'object') {
        Object.values(results.checks).forEach(check => {
          if (check && check.issues && Array.isArray(check.issues)) {
            issues.push(...check.issues);
          }
        });
      }

      // Extract from disability analysis
      if (results.disabilityAnalysis && typeof results.disabilityAnalysis === 'object') {
        Object.values(results.disabilityAnalysis).forEach(analysis => {
          if (analysis && analysis.issues && Array.isArray(analysis.issues)) {
            issues.push(...analysis.issues);
          }
        });
      }
      
      // Extract from raw violations
      if (results.violations && Array.isArray(results.violations)) {
        results.violations.forEach(violation => {
          issues.push({
            rule: violation.id,
            type: violation.id,
            message: violation.description,
            context: violation.nodes?.[0]?.html || '',
            impact: violation.impact
          });
        });
      }

      console.log(`📊 Extracted ${issues.length} issues from analysis results`);
      
      // Sort issues by priority/impact
      issues.sort((a, b) => {
        const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
        const aImpact = a.impact || 'moderate';
        const bImpact = b.impact || 'moderate';
        
        return (impactOrder[aImpact] || 99) - (impactOrder[bImpact] || 99);
      });
      
    } catch (error) {
      console.error('Error extracting issues:', error);
    }

    return issues;
  }
}

module.exports = AISuggestionsService;