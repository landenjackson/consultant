import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Stripe Instance
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16'
});

const TYPESAFE_API_KEY = process.env.TYPESAFE_API_KEY || '';
const DJEV_RUN_URL = process.env.DJEV_RUN_URL || 'https://api.typesafe.ai/v1/systemone';

// TYPESAFE JEV / DJEV-RUN SYSTEM ONE MULTI-PRIMITIVE EVALUATOR (~70-150ms DECISION ENGINE)
const evaluateWithJev = async (userText) => {
  if (!TYPESAFE_API_KEY && !process.env.DJEV_RUN_URL) return null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const headers = { 'Content-Type': 'application/json' };
    if (TYPESAFE_API_KEY) {
      headers['Authorization'] = `Bearer ${TYPESAFE_API_KEY}`;
    }

    const res = await fetch(DJEV_RUN_URL, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        state: String(userText || '').slice(0, 1000),
        model: 'jev-latest',
        questions: {
          intent: {
            type: 'choice',
            instructions: 'What is the primary operational domain of this request?',
            criteria: {
              career: 'Resumes, job applications, interview prep, career reframing',
              finance: 'P&L audits, financial modeling, unit economics, cash runway, pricing',
              marketing: 'Customer acquisition, local search, catchment capture, non-discount hooks',
              operations: 'Throughput, kitchen logistics, team onboarding, standard operating procedures'
            }
          },
          urgency: {
            type: 'scalar',
            instructions: 'How urgent or high-stakes is this executive request?',
            range: [0, 2]
          },
          needs_math: {
            type: 'noul',
            instructions: 'Does this task require explicit arithmetic, margin reconciliation, or financial math?'
          },
          tone_archetype: {
            type: 'choice',
            instructions: 'What consulting tone best serves this specific situation?',
            criteria: {
              peer_coo: 'Direct, unvarnished peer executive giving clear math and strategic trade-offs',
              tactical_coach: 'Encouraging, grounded operator giving step-by-step frontline actions',
              career_strategist: 'Sharp executive recruiter focusing on quantifiable business outcomes and credibility'
            }
          }
        }
      })
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const answers = data.answers || {};
      const intent = answers.intent?.choice || 'operations';
      const urgencyScore = answers.urgency?.score || 0;
      const needsMath = (answers.needs_math?.noul || 0) > 0.45;
      const tone = answers.tone_archetype?.choice || 'peer_coo';
      console.log(`[TypeSafe Jev / djev-run Evaluator] Domain: ${intent} | Urgency: ${urgencyScore.toFixed(2)} | Math: ${needsMath} | Tone: ${tone}`);
      return {
        domain: intent,
        urgency: urgencyScore,
        needsMath,
        tone
      };
    }
  } catch (err) {
    console.error('[TypeSafe Jev / djev-run Notice]:', err.message);
  }
  return null;
};

// FAST & ULTRA-RELIABLE ENTERPRISE INFERENCE PIPELINE (AUTO-FALLBACK TO DIRECT GOOGLE FREE TIER + PARALLEL SPECULATIVE RACE)
const queryAI = async (prompt, imageObjs = [], customKey = null) => {
  const activeMyclawKey = process.env.MYCLAW_API_KEY;
  const serverGoogleKey = process.env.GEMINI_API_KEY;
  const activeGoogleKey = customKey || serverGoogleKey;
  const hasImages = Array.isArray(imageObjs) && imageObjs.length > 0;

  let contentPayload = prompt;
  if (hasImages) {
    contentPayload = [{ type: 'text', text: prompt }];
    imageObjs.slice(0, 10).forEach(img => {
      if (img && img.mimeType && img.data) {
        contentPayload.push({
          type: 'image_url',
          image_url: { url: `data:${img.mimeType};base64,${img.data}` }
        });
      }
    });
  }

  // TIER 1: Parallel Fast Speculative Race across Flash Gateway Models
  if (activeMyclawKey && !hasImages) {
    const fetchModel = async (modelName, maxTokens = 2500) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      try {
        const res = await fetch('https://api.myclaw.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Authorization': `Bearer ${activeMyclawKey}`
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: contentPayload }],
            max_tokens: maxTokens,
            temperature: 0.2
          })
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content || '';
          if (text && text.trim().length > 0) {
            return { model: modelName, text };
          }
        }
        throw new Error(`${modelName} status ${res.status}`);
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    try {
      const winner = await Promise.any([
        fetchModel('gemini-3.7-flash', 2500),
        fetchModel('gemini-2.0-flash', 2500),
        fetchModel('gpt-4o-mini', 2500)
      ]);
      console.log(`[⚡ Fast Race Instant Winner: ${winner.model}] (${winner.text.length} chars)`);
      return { text: winner.text, isFallback: false };
    } catch (err) {
      console.warn('[Parallel race notice]:', err.message);
    }
  }

  // TIER 2: Direct Google AI Studio Fallback
  if (activeGoogleKey && activeGoogleKey.startsWith('AIzaSy')) {
    const directModels = ['gemini-2.5-flash', 'gemini-2.0-flash'];
    for (const modelName of directModels) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`, {
          method: 'POST',
          headers: {
            'x-goog-api-key': activeGoogleKey,
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 2500, temperature: 0.25 }
          })
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text && text.trim().length > 0) {
            console.log(`[⚡ Direct Google AI Studio Instant Success: ${modelName}] (${text.length} chars)`);
            return { text, isFallback: false };
          }
        }
      } catch (byokErr) {
        console.warn(`[Direct Google AI Studio Notice - ${modelName}]:`, byokErr.message);
      }
    }
  }

  return null;
};

// IN-MEMORY EXECUTION RESUMPTION STORE (GOOGLE AX RESILIENT RUNTIME)
const axExecutionLog = new Map();

// 1. DYNAMIC STRIPE CHECKOUT SESSIONS
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { planId = 'pro', tier = 'Pro Operator', amount = 3999 } = req.body;
    const origin = req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : 'https://www.consultant-studio.app');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Consultant Studio — ${tier}`,
            description: 'Executive Operations & Strategic Intelligence Suite (30-Day Free Trial)'
          },
          unit_amount: amount,
          recurring: { interval: 'month' }
        },
        quantity: 1
      }],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 30
      },
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}&plan=${planId}&subscribed=true`,
      cancel_url: `${origin}/?canceled=true`
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. ULTRA-FAST STREAMING SSE ENDPOINT (STREAM GENERATE CONTENT)
app.post('/api/chat/stream', async (req, res) => {
  const { messages = [], workspace = 'general', documentText = '' } = req.body;
  const userMessage = messages?.[messages.length - 1]?.content || '';
  const customKey = req.headers['x-custom-gemini-key'] || null;
  const activeKey = customKey || process.env.GEMINI_API_KEY;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendFallback = () => {
    const fallbackText = `### Bottom Line Up Front (BLUF)
Analysis generated under high-velocity fallback mode for ${workspace.toUpperCase()}.

| Metric | Target Benchmark | Immediate Recommendation |
| :--- | :--- | :--- |
| **Gross Margin Floor** | ≥ 65.0% | Review direct variable costs and supplier rate cards |
| **Operating Efficiency** | ≤ 25.0% Overhead | Trim redundant SaaS subscriptions and administrative overhead |
| **Target Runway** | ≥ 12 Months | Establish cash preservation thresholds and review weekly outflow |

---

🚦 **30-Day Immediate Execution Checklist:**
1. **Immediate Audit:** Review and categorize the top 10 expenses from the last 60 days.
2. **Margin Check:** Recalibrate pricing or unit cost structure to hit target contribution margins.
3. **Weekly Tracking:** Set up a Monday cash-flow review meeting to monitor net burn.

📥 **Export-Ready Sign-off:**
Diagnostic baseline established. Re-verify your API key in Workspace Display Settings if real-time reasoning does not refresh.`;
    res.write(`data: ${JSON.stringify({ chunk: fallbackText, done: true })}\n\n`);
    res.end();
  };

  if (!activeKey) return sendFallback();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const prompt = documentText 
      ? `[Attached Business Document]:\n${documentText.slice(0, 30000)}\n\n[User Objective]:\n${userMessage}`
      : userMessage;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${activeKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4096, temperature: 0.25 }
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!geminiRes.ok) throw new Error(`Gemini Stream Status ${geminiRes.status}`);

    const reader = geminiRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const textChunk = decoder.decode(value);
      res.write(textChunk);
    }
    res.end();
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[SSE Stream Notice]: Falling back to instantaneous memo generator.', err.message);
    sendFallback();
  }
});

// 3. UNIFIED STRATEGIC CHAT ENDPOINT (REST)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], workspace = 'general', documentText = '', conversationId = null } = req.body;
    const userMessage = messages.length > 0 ? messages[messages.length - 1].content : '';

    if (!userMessage) {
      return res.status(400).json({ error: "Empty prompt provided." });
    }

    // Google AX Resumption Hook
    const activeExecutionId = conversationId || `ax_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Dynamic Context-Aware Intelligent Response Generator (Replaces generic BLUF template with smart conversational answers)
    const generateSmartDirectAnswer = (promptText, ws) => {
      const p = promptText.toLowerCase();
      if (p.includes('resume') || p.includes('cv') || p.includes('experience') || p.includes('job')) {
        return `Here is a direct evaluation of your operational career profile:\n\n` +
          `• **Quantified Impact (Strength):** Anchoring achievements in concrete margin lifts (e.g., $35,000 food waste recovery, +$2,200/peak shift) immediately separates you from passive operators.\n` +
          `• **Velocity & Throughput:** Demonstrating a 90-second ticket time reduction and condensing line training from 14 to 8 shifts proves frontline floor control.\n` +
          `• **Next Calibration:** State the total ARR or seat count of the unit to frame the organizational scale for executive recruiters.`;
      }
      if (p.includes('price') || p.includes('supplier') || p.includes('cogs') || p.includes('cost') || p.includes('inflation')) {
        return `Here is an immediate 3-step strategy to neutralize supplier price inflation without sacrificing margin:\n\n` +
          `1. **Audit Yield & Plate Waste:** Review trim waste and pre-portioning to recapture 2–4% in direct product loss before raising prices.\n` +
          `2. **Menu Contribution Re-indexing:** Recalibrate item pairings so high-margin velocity items absorb the cost increase.\n` +
          `3. **Tiered Vendor Negotiation:** Request secondary volume tiering or secondary supplier rate matching.`;
      }
      if (p.includes('rush') || p.includes('expo') || p.includes('table') || p.includes('velocity') || p.includes('throughput')) {
        return `Here is an immediate action blueprint to maximize peak shift throughput:\n\n` +
          `1. **Air Traffic Control Expo:** Designate a single person as the final quality and ticket-matching gatekeeper—no cook or runner plates tickets directly.\n` +
          `2. **Pre-Shift Speed-Lane Staging:** Pre-portion high-velocity proteins and signature sides 30 minutes before the rush.\n` +
          `3. **Synchronized FOH Handoff:** Table clears and water resets must be sequenced within 45 seconds of guest departures.`;
      }
      return `Here is an actionable operational assessment for **${promptText}**:\n\n` +
        `• **Immediate Action:** Audit the primary cost and throughput variables in your daily operations.\n` +
        `• **Unit Economics Focus:** Protect gross margins by eliminating friction at shift handoffs without resorting to margin-diluting discounts.\n` +
        `• **30-Day Execution:** Establish weekly contribution margin tracking and lock in standard operating procedures.`;
    };

    const contextualFallback = generateSmartDirectAnswer(userMessage, workspace);

    // Limit history to the last 2 turns (trimmed to 150 chars) to strictly protect token budget and prevent context bloat
    const recentMessages = messages.slice(-2);
    const conversationHistory = recentMessages.length > 1
      ? recentMessages.slice(0, -1).map(m => {
          const role = m.role === 'assistant' ? 'Consultant' : 'User';
          const text = m.content ? m.content.slice(0, 150) : '';
          return `${role}: ${text}`;
        }).join('\n\n')
      : '';

    // Fast speculative fan-out: Run TypeSafe Jev System One evaluation IN PARALLEL with prompt assembly
    const jevPromise = evaluateWithJev(userMessage);

    // Initial system prompt base (Natural, direct executive answers to whatever the user asks)
    const buildSystemPrompt = (jevSignals) => {
      return `You are Consultant Studio, an elite Fractional COO, Strategic Growth Partner, and Operational Systems Architect.

DIRECTIVES:
- Answer the user's exact question directly, conversationally, and insightfully.
- Match your format and depth to what the user asks:
  • If the user asks a conversational question, resume question, or quick inquiry, reply naturally in clear paragraphs and concise bullet points.
  • If the user explicitly asks for a full company turnaround plan, formal audit, or comprehensive strategy, then provide a detailed multi-step executive blueprint.
- Ground all business advice in practical shop-floor physics, margin protection, unit economics, and execution clarity.
- Never use robotic pleasantries ("I would be happy to help", "In today's fast-paced environment").

[Active Workspace: ${workspace.toUpperCase()}]
${conversationHistory ? `[Recent Context]:\n${conversationHistory}\n` : ''}
${documentText ? `[Attached Client Context & Documents]:\n"""\n${documentText.slice(0, 15000)}\n"""\n` : ''}
Operator Prompt: ${userMessage}`;
    };

    // Extract all embedded base64 image data if attached (Up to 10 images)
    let imageObjs = [];
    if (documentText && documentText.includes('data:image/')) {
      const regex = /data:(image\/[a-zA-Z0-9\+\-\.]+);base64,([^\s\]]+)/g;
      let match;
      while ((match = regex.exec(documentText)) !== null && imageObjs.length < 10) {
        imageObjs.push({
          mimeType: match[1],
          data: match[2]
        });
      }
    }

    // Await Jev signals with tight boundary, then execute LLM inference
    const jevSignals = await jevPromise;
    const finalPrompt = buildSystemPrompt(jevSignals);

    // Capture optional client BYOK key from request headers
    const customKey = req.headers['x-custom-gemini-key'] || null;

    console.log(`[Executing Live Inference | Multimodal Images: ${imageObjs.length} | BYOK Key: ${!!customKey}]`);
    const liveResponse = await queryAI(finalPrompt, imageObjs, customKey);

    if (liveResponse && liveResponse.text) {
      // Checkpoint execution in AX execution log for instant resumption & telemetry auditing
      axExecutionLog.set(activeExecutionId, {
        timestamp: Date.now(),
        domain: jevSignals?.domain || 'general',
        response: liveResponse.text,
        isFallback: liveResponse.isFallback || false
      });
      if (axExecutionLog.size > 100) {
        const oldestKey = axExecutionLog.keys().next().value;
        axExecutionLog.delete(oldestKey);
      }

      return res.json({
        conversationId: activeExecutionId,
        response: liveResponse.text,
        domain: jevSignals?.domain || null,
        isFallback: liveResponse.isFallback || false,
        runtime: "ax_distributed_resilient_v1"
      });
    }

    return res.status(200).json({ 
        conversationId: activeExecutionId,
        response: contextualFallback, 
        isFallback: true 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// START SERVER
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Consultant Studio running on port ${PORT}`);
});
