
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

// ✅ AI controlled by environment (ENABLE_AI=true to turn ON)
const AI_ENABLED = process.env.ENABLE_AI === "true";

class AISuggestionsService {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    if (this.geminiApiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(this.geminiApiKey);
        console.log(`🤖 Gemini AI initialized | Model: ${this.modelName}`);
      } catch (e) {
        console.warn("⚠️ Gemini SDK init failed:", e.message || e);
        this.genAI = null;
      }
    } else {
      console.warn("❌ No GEMINI_API_KEY found — AI disabled");
      this.genAI = null;
    }

    console.log("AI Enabled:", AI_ENABLED ? "✅ Yes" : "❌ No");
  }

  // ✅ REST fallback
  async restGenerateText(prompt, timeoutMs = 9000) {
    if (!this.geminiApiKey) throw new Error("GEMINI_API_KEY missing");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.geminiApiKey}`;
    
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 300 }
    };

    const resp = await axios.post(url, body, { timeout: timeoutMs });
    const text =
      resp?.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      resp?.data?.candidates?.[0]?.output ||
      "";

    return String(text).trim();
  }

  async getGeminiSuggestion(issue) {
    const prompt = this.buildGeminiPrompt(issue);

    // ✅ use SDK if available
    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: this.modelName });
        const res = await model.generateContent(prompt);
        const text = (await res.response.text()).replace(/[*`]/g, "").trim();

        return this.formatSuggestion(issue, text);
      } catch (err) {
        console.warn("⚠️ Gemini SDK failed, trying REST:", err.message);
      }
    }

    // ✅ REST fallback
    try {
      const text = await this.restGenerateText(prompt, 9000);
      return this.formatSuggestion(issue, text);
    } catch (e) {
      console.warn("❌ Gemini REST failed, using fallback");
      return this.getFallbackSuggestion(issue);
    }
  }

  formatSuggestion(issue, text) {
    return {
      issue_type: issue.rule || issue.type || "Accessibility Issue",
      issue_message: issue.message,
      ai_suggestion: text,
      priority: this.getPriority(issue.rule || issue.type),
      estimated_fix_time: this.getEstimatedTime(issue.rule || issue.type)
    };
  }

  buildGeminiPrompt(issue) {
    return `
Accessibility Issue: ${issue.rule || issue.type}
Description: ${issue.message}
HTML Snippet: ${issue.context || "N/A"}

Respond with:
1 sentence explanation
3 numbered actionable fixes
1 short code example (no markdown)
`.trim();
  }

  // ✅ Fallback suggestion generator
  getFallbackSuggestion(issue) {
    const rule = (issue.rule || issue.type || "").toLowerCase();

    if (rule.includes("alt"))
      return { issue_type: "Missing Alt Text", ai_suggestion: 'Add descriptive alt attribute: <img src="img.png" alt="Description">', priority: "high", estimated_fix_time: "5-10 min" };

    if (rule.includes("label"))
      return { issue_type: "Missing Label", ai_suggestion: '<label for="name">Name</label><input id="name">', priority: "high", estimated_fix_time: "5-10 min" };

    if (rule.includes("contrast"))
      return { issue_type: "Low Contrast", ai_suggestion: "Use higher contrast colors following WCAG AA.", priority: "medium", estimated_fix_time: "10-30 min" };

    return { issue_type: rule, ai_suggestion: "Follow WCAG standards.", priority: "medium", estimated_fix_time: "10-30 min" };
  }

  extractAllIssues(results) {
    const issues = [];

    try {
      if (Array.isArray(results.violations)) {
        results.violations.forEach(v =>
          issues.push({
            rule: v.id,
            type: v.id,
            message: v.description,
            context: v.nodes?.[0]?.html || ""
          })
        );
      }
    } catch (e) {
      console.warn("extract issues error:", e.message);
    }

    return issues.slice(0, 6);
  }

  async generateSuggestions(analysisResults) {
    console.log("🔄 AI Suggestion Process start");

    const allIssues = this.extractAllIssues(analysisResults);
    if (allIssues.length === 0)
      return { success: true, ai_suggestions: [], message: "No issues found" };

    const suggestions = [];

    for (let issue of allIssues) {
      let suggestion;

      if (AI_ENABLED) {
        suggestion = await this.getGeminiSuggestion(issue);
      } else {
        console.log("⚠️ AI disabled — fallback mode only");
        suggestion = this.getFallbackSuggestion(issue);
      }

      suggestions.push(suggestion);
    }

    return { success: true, ai_suggestions: suggestions };
  }

  getPriority(t) {
    t = (t || "").toLowerCase();
    if (t.includes("alt") || t.includes("label")) return "high";
    return "medium";
  }

  getEstimatedTime(t) {
    t = (t || "").toLowerCase();
    if (t.includes("alt")) return "5-10 minutes";
    return "10-30 minutes";
  }
}

module.exports = AISuggestionsService;
