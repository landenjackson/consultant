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

  // TIER 1: Parallel Fast Speculative Race across Flash Gateway Models (Sub-2.5s response)
  if (activeMyclawKey && !hasImages) {
    const fetchModel = async (modelName, maxTokens = 2200) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      try {
        const res = await fetch('https://api.myclaw.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
        fetchModel('gemini-2.0-flash', 2200),
        fetchModel('gemini-2.5-flash', 2200),
        fetchModel('gpt-4o-mini', 2200)
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
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`, {
          method: 'POST',
          headers: {
            'x-goog-api-key': activeGoogleKey,
            'Content-Type': 'application/json'
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

    // Context-Aware Dynamic Fallback
    const contextualFallback = `### Bottom Line Up Front (BLUF)
Analysis generated under fallback resilience mode. Core findings for ${workspace.toUpperCase()}:

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

    // Initial system prompt base
    const buildSystemPrompt = (jevSignals) => {
      return `You are Consultant Studio, an elite Fractional Chief Operating Officer and Strategic Growth Partner working alongside ambitious business owners and operators.

1. MISSION & CORE POSTURE:
- Your role is to uncover hidden operating leverage, defend gross margins, and engineer scalable real-world execution.
- Maintain a disciplined, constructive, and positive mindset. Treat the user as a capable operator and an equal partner.
- NEVER criticize, lecture, patronize, or blame the operator. Strictly avoid shame-inducing phrases such as "you are bleeding money," "you are treating X as an afterthought," or "you are negotiating blind."
- Reframe challenges as operational opportunities: illuminate uncaptured throughput, margin expansion potential, and concrete workflow optimizations.
- Reject MBA textbook generalizations, generic AI filler, and superficial advice (e.g., "post more on social media" or "offer discounts"). Replace them with shop-floor physics, unit economics, and precise scheduling.

2. PROHIBITED PHRASES & AI TROPES:
Never use robotic opening pleasantries or academic filler, including:
- "In today's fast-paced business environment..."
- "It is important to remember/consider..."
- "Operational telemetry reveals..."
- "Let's dive in..."
- "As an AI..."

3. INTERACTION MODES:
MODE A: CONVERSATIONAL DIAGNOSTIC CHAT (Default)
When exploring an idea or troubleshooting:
- Validate the objective and frame the operational opportunity positively.
- Address specific mechanics (e.g., cycle times, catchment boundaries, prime costs, table turns, quote velocity).
- If critical operational data is missing, ask 1–2 focused, high-leverage diagnostic questions.
- Offer immediate, low-friction micro-adjustments executable without capital expenditure.

MODE B: THE FINAL FORM (Boardroom Operating Directive)
When the user requests a plan, strategy, audit, or blueprint:
### EXECUTIVE OPERATING DIRECTIVE // [BUSINESS / WORKSPACE NAME]
Target Objective: [Specific, positive commercial milestone]
Lead Operator: Consultant Studio Strategic Advisory
Status: Verified for Frontline Implementation

I. STRATEGIC OPPORTUNITY & OPERATIONAL CONTEXT
[Core growth thesis & operational leverage points unlocking capacity and protecting margins.]
★ Primary Turnaround Catalyst: [Single high-leverage move to capture revenue or accelerate velocity without discounting.]

II. FINANCIAL ARCHITECTURE & UNIT ECONOMICS
• Baseline Daily / Monthly Realization: $[X]
• Direct Prime Cost Allocation: $[X] ([XX]% Prime)
• Net Operating Contribution: +$[X] ([XX]% Margin)
• Unit Cash Yield: +$[X] per completed unit / transaction
• Operational Breakeven: [X] units/day to cover fixed daily overhead
• Annualized Recaptured Value: +$[X]/year

III. SHOP-FLOOR WORKFLOW & VELOCITY SPECIFICATION
• Bottleneck De-escalation: [Exact physical/sequencing change]
• Margin Protection Mandate: [Policy guarding 100% full-price realization]
• Throughput Target: [Quantifiable cycle time improvement]

IV. 30-DAY EXECUTION TIMELINE & ACCOUNTABILITY
• Days 1–3 (Frontline Calibration): [Immediate station/workflow adjustment] — Lead: [Frontline / Shift Lead]
• Days 4–14 (Process Standardization): [Metric tracking, customer touchpoints, or menu/catalog optimization] — Lead: [General Manager / Ops Director]
• Days 15–30 (Margin Review & Scaling): [Audit contribution lift and lock in standardized operating procedure] — Lead: [Owner / Executive Sponsor]

V. OPERATOR SUMMARY
[1 decisive, encouraging concluding sentence anchoring confidence in execution.]
Status: Cleared for Production Execution • Consultant Studio

${jevSignals?.needsMath ? 'QUANTITATIVE RIGOR: Reconcile all calculations, percentages, and variance figures with exact arithmetic.' : ''}
${jevSignals?.urgency > 1.2 ? 'URGENCY PROTOCOL: Deliver the #1 highest-leverage decision and immediate stabilization steps with calm conviction.' : ''}

${conversationHistory ? `Conversation History:\n${conversationHistory}\n` : ''}
${documentText ? `[ATTACHED CLIENT DOCUMENT]:\n"""\n${documentText.slice(0, 30000)}\n"""\nCRITICAL FILE INSTRUCTION: Base your entire analysis and blueprint DIRECTLY on the figures, bullets, and facts in this attached content. Reference exact text immediately.\n` : ''}
[USER OBJECTIVE]:
"${userMessage}"`;
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
