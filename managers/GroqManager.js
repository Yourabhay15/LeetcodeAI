import { GROQ_API_KEY, GROQ_MODEL } from "../data.js";
import Logger from "../utils/Logger.js";

class GroqManager {
  /**
   * Fetches problem details (title, content, code snippets) from LeetCode's GraphQL API.
   * @param {string} problemSlug - The URL slug of the problem (e.g., "3sum").
   */
  static async fetchLeetCodeProblemDetails(problemSlug, attempt = 1) {
    Logger.warn(`[GQL_FETCH]\t\t\t: Fetching details for ${problemSlug} (attempt ${attempt})`);
    const query = `
      query questionEditorData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionId
          questionFrontendId
          title
          titleSlug
          content
          codeSnippets {
            lang
            langSlug
            code
          }
        }
      }
    `;

    try {
      const response = await fetch("https://leetcode.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Referer": "https://leetcode.com",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        },
        body: JSON.stringify({
          query,
          variables: { titleSlug: problemSlug }
        })
      });

      if (!response.ok) {
        throw new Error(`LeetCode GraphQL responded with status ${response.status}`);
      }

      const result = await response.json();
      if (!result.data || !result.data.question) {
        throw new Error(`Problem "${problemSlug}" not found on LeetCode.`);
      }

      return result.data.question;
    } catch (error) {
      if (attempt < 3) {
        Logger.warn(`[GQL_FETCH_RETRY]\t\t: Attempt ${attempt} failed for ${problemSlug}. Retrying in 2 seconds...`, error.message);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.fetchLeetCodeProblemDetails(problemSlug, attempt + 1);
      }
      Logger.error(`[GQL_FETCH_FAILED]\t\t: Failed for ${problemSlug} after 3 attempts`, error);
      throw error;
    }
  }

  /**
   * Extracts clean code solution from model output (handling code fences).
   */
  static #extractCode(responseContent) {
    const match = responseContent.match(/```(?:\w+)?\n([\s\S]*?)\n```/);
    if (match) {
      return match[1].trim();
    }
    return responseContent.trim();
  }

  static async #fetchGroqCompletionWithRetry(systemPrompt, userPrompt, attempt = 1) {
    try {
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.1
        })
      });

      if (!groqResponse.ok) {
        const errorText = await groqResponse.text();
        throw new Error(`Groq API responded with status ${groqResponse.status}: ${errorText}`);
      }

      const data = await groqResponse.json();
      return data.choices[0].message.content;
    } catch (error) {
      if (attempt < 3) {
        Logger.warn(`[GROQ_COMPLETIONS_RETRY]\t: Attempt ${attempt} failed. Retrying in 2 seconds...`, error.message);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.#fetchGroqCompletionWithRetry(systemPrompt, userPrompt, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Generates a solution for a LeetCode problem using the Groq API.
   * @param {string} problemSlug - The problem slug.
   * @param {string} targetLanguageSlug - The target language (e.g., "cpp", "python3").
   */
  static async generateSolution(problemSlug, targetLanguageSlug) {
    if (!GROQ_API_KEY || GROQ_API_KEY === "YOUR_GROQ_API_KEY_HERE") {
      throw new Error("GROQ_API_KEY is not configured in .env file.");
    }

    const question = await this.fetchLeetCodeProblemDetails(problemSlug);
    
    if (!question.codeSnippets) {
      throw new Error(`PREMIUM_LOCKED: Problem "${problemSlug}" is locked for premium users.`);
    }
    
    // Find matching code snippet for the target language
    const snippet = question.codeSnippets.find(
      (s) => s.langSlug.toLowerCase() === targetLanguageSlug.toLowerCase()
    );

    if (!snippet) {
      throw new Error(
        `Language "${targetLanguageSlug}" snippet not found for problem "${problemSlug}". Available: ${question.codeSnippets
          .map((s) => s.langSlug)
          .join(", ")}`
      );
    }

    const systemPrompt = `You are an expert algorithms developer. Solve the LeetCode problem using the provided starter code stub.
IMPORTANT:
1. Complete the implementation inside the provided code snippet structure.
2. Return ONLY the finished code solution. Do NOT explain the solution, do not add comments (unless necessary for logic), and do not include test cases.
3. The solution must be optimal in time and space complexity.
4. Return the code wrapped in a standard markdown code block.`;

    const userPrompt = `Problem Title: ${question.title}
Problem Description (HTML):
${question.content}

Target Language: ${snippet.lang}
Starter Code Stub:
\`\`\`${snippet.langSlug}
${snippet.code}
\`\`\`

Complete the code solution:`;

    Logger.warn(`[GROQ_GENERATE]\t\t: Requesting solution for ${problemSlug} using ${GROQ_MODEL}`);

    const rawContent = await this.#fetchGroqCompletionWithRetry(systemPrompt, userPrompt);
    const cleanCode = this.#extractCode(rawContent);

    Logger.success(`[GROQ_GENERATED]\t\t: Solution received for ${problemSlug} (${cleanCode.length} chars)`);
    return {
      problemName: problemSlug,
      language: targetLanguageSlug,
      code: cleanCode
    };
  }
}

export default GroqManager;
