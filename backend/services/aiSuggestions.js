// ...existing code...
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
//new
const AI_ENABLED = true; // ⛔ turn OFF AI suggestions

class AISuggestionsService {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    if (this.geminiApiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(this.geminiApiKey);
        console.log(`🤖 Gemini AI Service initialized with ${this.modelName} ✅`);
      } catch (e) {
        console.warn("⚠️ Gemini SDK init failed, SDK disabled:", e.message || e);
        this.genAI = null;
      }
    } else {
      console.log("⚠️ No Gemini API key found");
      this.genAI = null;
    }

    console.log("API Key available:", this.geminiApiKey ? "Yes ✅" : "No ❌");
  }

  // REST fallback
  async restGenerateText(prompt, timeoutMs = 9000) {
    if (!this.geminiApiKey) throw new Error("GEMINI_API_KEY missing");
    const model = this.modelName || "text-bison-001";
    const url = `https://generativelanguage.googleapis.com/v1beta2/models/${model}:generateText?key=${this.geminiApiKey}`;
    const body = {
      prompt: { text: prompt },
      temperature: 0.2,
      candidateCount: 1,
      maxOutputTokens: 300,
    };

    const resp = await axios.post(url, body, { timeout: timeoutMs });
    const data = resp?.data || {};
    const candidate = data.candidates?.[0] || data.candidate || null;
    if (candidate) return String(candidate.output || candidate.content || candidate.text || "").trim();
    if (typeof data.output === "string") return data.output;
    throw new Error("No candidate returned from generative API");
  }

  async getGeminiSuggestion(issue) {
    const prompt = this.buildGeminiPrompt(issue);

    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: this.modelName });
        const res = await model.generateContent(prompt);
        const response = await res.response;
        const text = (response.text() || "").replace(/[*`]/g, "").trim();

        return {
          issue_type: issue.rule || issue.type || "Accessibility Issue",
          issue_message: issue.message || "",
          ai_suggestion: text,
          priority: this.getPriority(issue.rule || issue.type),
          estimated_fix_time: this.getEstimatedTime(issue.rule || issue.type),
        };
      } catch (err) {
        console.warn("Gemini SDK error, falling back to REST/fallback:", err?.message || err);
        if (this.geminiApiKey) {
          try {
            const text = await this.restGenerateText(prompt, 9000);
            return {
              issue_type: issue.rule || issue.type || "Accessibility Issue",
              issue_message: issue.message || "",
              ai_suggestion: (text || "").replace(/[*`]/g, "").trim(),
              priority: this.getPriority(issue.rule || issue.type),
              estimated_fix_time: this.getEstimatedTime(issue.rule || issue.type),
            };
          } catch (restErr) {
            console.warn("REST fallback failed:", restErr?.message || restErr);
          }
        }
        return this.getFallbackSuggestion(issue);
      }
    }

    // No SDK available -> try REST if key present
    if (this.geminiApiKey) {
      try {
        const text = await this.restGenerateText(prompt, 9000);
        return {
          issue_type: issue.rule || issue.type || "Accessibility Issue",
          issue_message: issue.message || "",
          ai_suggestion: (text || "").replace(/[*`]/g, "").trim(),
          priority: this.getPriority(issue.rule || issue.type),
          estimated_fix_time: this.getEstimatedTime(issue.rule || issue.type),
        };
      } catch (err) {
        console.warn("REST generation failed:", err?.message || err);
        return this.getFallbackSuggestion(issue);
      }
    }

    return this.getFallbackSuggestion(issue);
  }

  buildGeminiPrompt(issue) {
    return `
Accessibility Issue: ${issue.rule || issue.type || "Unknown"}
Description: ${issue.message || "No description provided"}
Context: ${issue.context || issue.html || "N/A"}

Provide:
1) One-sentence explanation of why this matters
2) Three concrete, numbered steps to fix it
3) A small, plain code example (no markdown)

Return plain text only.
`.trim();
  }

  getFallbackSuggestion(issue) {
    const type = (issue.rule || issue.type || "").toLowerCase();
    if (type.includes("alt")) {
      return {
        issue_type: issue.rule || "missingAltText",
        issue_message: issue.message || "Image missing alt text",
        ai_suggestion: 'Add descriptive alt text, e.g. <img src="..." alt="Description">',
        priority: "high",
        estimated_fix_time: "5-15 minutes",
        is_fallback: true,
      };
    }
    if (type.includes("label")) {
      return {
        issue_type: issue.rule || "missingLabel",
        issue_message: issue.message || "Form control missing label",
        ai_suggestion: 'Add a label element: <label for="name">Name</label><input id="name" />',
        priority: "high",
        estimated_fix_time: "2-10 minutes",
        is_fallback: true,
      };
    }
    if (type.includes("link")) {
      return {
        issue_type: issue.rule || "emptyLinkText",
        issue_message: issue.message || "Link missing accessible text",
        ai_suggestion: 'Provide descriptive link text or aria-label attributes.',
        priority: "medium",
        estimated_fix_time: "5-20 minutes",
        is_fallback: true,
      };
    }
    return {
      issue_type: issue.rule || issue.type || "accessibility",
      issue_message: issue.message || "Accessibility issue detected",
      ai_suggestion: "Refer to WCAG guidance for the rule and apply semantic HTML and ARIA correctly.",
      priority: "medium",
      estimated_fix_time: "10-30 minutes",
      is_fallback: true,
    };
  }

  getPriority(t) {
    if (!t) return "medium";
    const s = (t || "").toLowerCase();
    if (s.includes("alt") || s.includes("label") || s.includes("keyboard") || s.includes("missing")) return "high";
    if (s.includes("contrast") || s.includes("heading")) return "high";
    return "medium";
  }

  getEstimatedTime(t) {
    if (!t) return "10-30 minutes";
    const s = (t || "").toLowerCase();
    if (s.includes("alt")) return "5-15 minutes";
    if (s.includes("label")) return "2-10 minutes";
    if (s.includes("contrast")) return "15-45 minutes";
    return "10-30 minutes";
  }

  extractAllIssues(results) {
    const issues = [];
    try {
      if (results.checks && typeof results.checks === "object") {
        Object.values(results.checks).forEach((c) => {
          if (Array.isArray(c?.issues)) issues.push(...c.issues);
        });
      }
      if (results.disabilityAnalysis && typeof results.disabilityAnalysis === "object") {
        Object.values(results.disabilityAnalysis).forEach((d) => {
          if (Array.isArray(d?.issues)) issues.push(...d.issues);
        });
      }
      if (Array.isArray(results.violations)) {
        results.violations.forEach((v) => {
          issues.push({
            rule: v.id,
            type: v.id,
            message: v.description,
            context: v.nodes?.[0]?.html || "",
            impact: v.impact,
          });
        });
      }
      const weight = { critical: 0, serious: 1, moderate: 2, minor: 3 };
      issues.sort((a, b) => (weight[a.impact] ?? 99) - (weight[b.impact] ?? 99));
    } catch (e) {
      console.warn("extractAllIssues error:", e?.message || e);
    }
    return issues;
  }

  async generateSuggestions(analysisResults) {
    console.log("🔄 Starting AI suggestions generation...");
    if (!analysisResults) {
      return { ai_suggestions: [], success: false, error: "Analysis results are required" };
    }

    try {
      const allIssues = this.extractAllIssues(analysisResults);
      console.log(`📋 Found ${allIssues.length} issues to process`);
      if (allIssues.length === 0) return { ai_suggestions: [], success: true, message: "No issues found" };

      const topIssues = allIssues.slice(0, 6);
      const aiSuggestions = [];

      for (let i = 0; i < topIssues.length; i++) {
        const issue = topIssues[i];
        console.log(`🔍 Processing issue ${i + 1}:`, issue.rule || issue.type);
        try {
          //chnage
          let suggestion;

if (AI_ENABLED) {
  suggestion = await this.getGeminiSuggestion(issue);
} else {
  console.log("⚠️ AI disabled — using fallback suggestions only");
  suggestion = this.getFallbackSuggestion(issue);
}

aiSuggestions.push(suggestion);

          //const suggestion = await this.getGeminiSuggestion(issue);
         // aiSuggestions.push(suggestion);
        } catch (e) {
          console.warn("AI suggestion generation error for issue:", e?.message || e);
          aiSuggestions.push(this.getFallbackSuggestion(issue));
        }
        await new Promise((r) => setTimeout(r, 400));
      }

      const unique = [];
      const seen = new Set();
      for (let idx = 0; idx < aiSuggestions.length; idx++) {
        const s = aiSuggestions[idx] || {};
        let key = (s.issue_type || s.issue_message || s.ai_suggestion || "").toString().toLowerCase().slice(0, 60).trim();
        if (!key) key = `__idx_${idx}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(s);
        }
      }

      if (unique.length > 1) {
        try {
          const overall = await this.generateOverallSuggestion?.(analysisResults, unique).catch(() => null);
          if (overall) unique.unshift(overall);
        } catch (e) {
          console.warn("Overall suggestion generation failed:", e?.message || e);
        }
      }

      console.log("✅ AI suggestions generated (unique):", unique.length);

      return {
        ai_suggestions: unique,
        aiSuggestions: unique,
        success: true,
        total_processed: topIssues.length,
        suggestions_generated: unique.length,
        ai_provider: this.genAI ? "gemini-sdk" : "gemini-rest",
        model_used: this.modelName,
      };
    } catch (error) {
      console.error("❌ Error in generateSuggestions:", error);
      return {
        ai_suggestions: [],
        aiSuggestions: [],
        success: false,
        error: error?.message || String(error),
      };
    }
  }

  // Optional overall suggestion generator (keeps simple fallback if not implemented)
  async generateOverallSuggestion(analysisResults, existingSuggestions) {
    try {
      let score = 0;
      if (analysisResults && analysisResults.summary) {
        const s = analysisResults.summary;
        score = (s.overallScore ?? s.overall) || 0;
      } else {
        score = 0;
      }

      const total = (analysisResults && analysisResults.summary && (analysisResults.summary.totalIssues)) ||
                    (analysisResults && Array.isArray(analysisResults.issues) && analysisResults.issues.length) ||
                    existingSuggestions.length || 0;

      const types = existingSuggestions.map(s => s.issue_type).filter(Boolean).slice(0,6).join(', ') || 'accessibility issues';
      const text = `Accessibility Score: ${score}. Total issues: ${total}. Key areas: ${types}. Recommendations: 1) Fix high priority issues first. 2) Add alt text and labels. 3) Improve color contrast. 4) Integrate automated checks (axe-core) into CI.`;
      return {
        issue_type: "Overall Accessibility Assessment",
        issue_message: "",
        ai_suggestion: text,
        priority: "high",
        estimated_fix_time: "Varies",
        is_overall: true,
      };
    } catch (e) {
      return {
        issue_type: "Overall Accessibility Assessment",
        issue_message: "",
        ai_suggestion: "Review top issues and prioritize fixes (alt text, labels, contrast).",
        priority: "high",
        estimated_fix_time: "Varies",
        is_overall: true,
      };
    }
  }
}

module.exports = AISuggestionsService;
// ...existing code...
