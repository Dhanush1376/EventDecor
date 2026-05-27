# AI & Recommendation System Security Architecture

This document details the security countermeasures implemented to harden the Siri Arts & Crafts AI search and recommendation engine against abuse, prompt injection, and manipulation.

## 1. Prompt Injection Prevention

Raw user input must never be passed directly to an LLM. The `aiSanitizer.ts` utility acts as an application firewall between the user's search query and the Groq API.

### 1.1 Detection Mechanisms
The system scans incoming queries for:
- **Role Switching:** `Ignore previous instructions`, `System:`, `You are now a...`
- **Delimiter Bypasses:** `<|`, `|>`, `[INST]`
- **Excessive Unicode:** Floods of repetitive characters or non-printable bytes designed to exhaust context windows or induce hallucination.

### 1.2 Mitigation Strategy
- **Truncation:** Queries are hard-capped at 200 characters before analysis.
- **Scoring System:** Malicious patterns increase a internal `threatScore`. 
- **AI Bypass:** If the threat score exceeds the threshold (e.g., score >= 5), the AI pipeline is entirely skipped. The system gracefully degrades to the local, deterministic search algorithm.

---

## 2. Recommendation Manipulation Countermeasures

Recommendation engines are vulnerable to data poisoning, where attackers simulate fake interactions to artificially boost a product's ranking or skew a user's profile.

### 2.1 Analytics Input Validation
- **Batch Deduplication:** The `/api/tracking/batch` endpoint now deduplicates events within the same batch. An attacker sending 20 `product_click` events for the same `targetId` in one payload will only register 1 event.
- **Target Verification:** The `targetId` is enforced strictly as a valid MongoDB ObjectId.
- **Metadata Sanitization:** `category`, `style`, and `searchQuery` fields inside the interaction metadata are aggressively stripped of HTML tags to prevent attackers from storing XSS payloads inside analytics data.

### 2.2 Scoring Engine Limits
- **Memory Spikes:** `scoringEngine.ts` limits the historical interaction fetch to the 500 most recent events per user. This prevents a bot with 10,000 synthetic interactions from crashing the V8 heap during matrix multiplication.
- **Time Decay:** The algorithm utilizes an exponential time-decay function. Fake clicks from 30 days ago hold exponentially less weight than legitimate interactions today, naturally aging out manipulation campaigns.

---

## 3. Output Sanitization & Safe Rendering

The AI search expands user queries with synonyms, translations, and corrected spellings. If an attacker inputs `<script>alert(1)</script>`, and the AI echoes it back in the `correctedQuery` field, the frontend could execute the payload.

### 3.1 Zod-style Schema Validation
We do not trust the JSON structure returned by the LLM. 
- `validateAIResponse()` explicitly coerces and validates the Groq response against a strict whitelist.
- If the AI generates arbitrary keys, arrays containing deep nested objects, or invalid enum values for `category` or `style`, the validation fails and falls back to local search.

### 3.2 HTML Escaping
- All string values returned by the AI (including expanded terms and corrected queries) are passed through `htmlEscapeString()`.
- Angle brackets, quotes, and ampersands are converted to safe HTML entities (`&lt;`, `&gt;`, `&quot;`) *before* being cached or sent to the frontend.
- **Security Headers:** The `X-Content-Type-Options: nosniff` header is strictly enforced on all search and recommendation API responses to prevent MIME-sniffing XSS vulnerabilities.

---

## 4. Production-Safe Integration Checklist

When extending the AI or recommendation systems in the future, adhere to these rules:

1. **Never construct prompts via string concatenation with raw input.** Always pass the input through `sanitizePromptInput()` first.
2. **Never trust AI JSON.** Always validate the parsed object against a strict schema.
3. **Never render raw strings.** Ensure frontend components use React's natural XSS protection (rendering via `{variable}`) or explicitly sanitize if using `dangerouslySetInnerHTML`.
4. **Assume Analytics are Poisoned.** Do not execute queries or render HTML based on analytics metadata without validation. Treat `UserInteraction` documents as untrusted user input.
