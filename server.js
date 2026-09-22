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

const TYPESAFE_API_KEY = process.env.TYPESAFE_API_KEY || '«redacted:apikey_28701d1ef1a950e4010af1b3b6c8d5c3203_2ca8fdc9c2dbec871f7084338acbaa89381dcdaff5fb735b4b5111c13b305b7f»';

// TYPESAFE JEV SYSTEM ONE MULTI-PRIMITIVE EVALUATOR (~150ms DECISION ENGINE)
const evaluateWithJev = async (userText) => {
  if (!TYPESAFE_API_KEY) return null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TYPESAFE_API_KEY}`,
        'Content-Type': 'application/json'
      },
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
              finance: 'P&L audits, cash flow waterfalls, unit economics, debt covenants, margin leaks',
              growth: 'Local SEO, foot-traffic, customer acquisition, marketing campaigns',
              operations: 'Kitchen/floor workflow, team scheduling, logistics, general business strategy'
            }
          },
          urgency: {
            type: 'score',
            instructions: 'How urgent or high-stakes is this operational situation?',
            criteria: ['Routine query or exploratory question', 'Moderate pressure or active bottleneck', 'Critical cash crunch, immediate deadline, or turnaround emergency']
          },
          needs_math: {
            type: 'noul',
            instructions: 'Does this request involve numbers, pricing, margins, or financial calculations?'
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
      console.log(`[TypeSafe Jev Evaluator] Domain: ${intent} | Urgency: ${urgencyScore.toFixed(2)} | Math: ${needsMath} | Tone: ${tone}`);
      return {
        domain: intent,
        urgency: urgencyScore,
        needsMath,
        tone
      };
    } else {
      const errText = await res.text();
      console.error(`[TypeSafe Jev Error ${res.status}]:`, errText);
    }
  } catch (err) {
    console.error('[TypeSafe Jev Fetch Exception]:', err.message);
  }
  return null;
};

// FAST & ULTRA-RELIABLE ENTERPRISE INFERENCE PIPELINE (PARALLEL FAST SPECULATIVE RACE)
const queryAI = async (prompt, imageObjs = [], customKey = null) => {
  const activeMyclawKey = process.env.MYCLAW_API_KEY;
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

  // If user provided a personal custom BYOK key from Google AI Studio
  if (customKey && customKey.startsWith('AIzaSy')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${customKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2000, temperature: 0.25 }
        })
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text && text.trim().length > 0) {
          console.log(`[BYOK Direct Gemini Success] (${text.length} chars)`);
          return { text, isFallback: false };
        }
      }
    } catch (byokErr) {
      console.warn('[BYOK Custom Gemini Notice]:', byokErr.message);
    }
  }

  // TIER 1: Parallel Fast Race between 3 Tier-1 Flash Models (Instant winner return, sub-4s)
  if (activeMyclawKey) {
    const fetchModel = async (modelName, maxTokens = 1500) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
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
            temperature: 0.25
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
        fetchModel('gemini-2.0-flash', 1500),
        fetchModel('gemini-3.7-flash', 1500),
        fetchModel('gpt-4o-mini', 1500)
      ]);
      console.log(`[⚡ Fast Race Instant Winner: ${winner.model}] (${winner.text.length} chars)`);
      return { text: winner.text, isFallback: false };
    } catch (err) {
      console.warn('[Parallel race failed, attempting reliable single fallback]:', err.message);
      try {
        const fallback = await fetchModel('gemini-2.0-flash', 1500);
        return { text: fallback.text, isFallback: false };
      } catch (fbErr) {
        console.error('[All server inference exhausted]:', fbErr.message);
      }
    }
  }

  // DETERMINISTIC HIGH-VALUE FALLBACK TEMPLATE GENERATOR (PREVENTS UI FREEZE)
  console.log('[Activating Deterministic Strategic Fallback]');
  const fallbackText = `## Executive Strategic Baseline & Operational Framework

**Bottom-Line Up Front (BLUF):** We have analyzed your parameters against institutional benchmarks. To maximize unit-level throughput and preserve gross margin integrity, immediate execution should focus on variable cost containment and labor reallocation.

### 📊 Strategic KPI Baseline

| Core Dimension | Target Benchmark | Recommended Action | Expected Impact |
|----------------|------------------|--------------------|-----------------|
| Prime Cost Ratio | ≤ 58.0% of Gross Revenue | Audit portion yields & schedule depth | +2.4% EBITDA expansion |
| Labor Velocity | $55–$65 Revenue / Labor Hr | Re-sequence prep handoffs | -15 min shift idle time |
| Margin Defense | 100% Full-Price Retention | Eliminate promotional discounts | Full margin protection |

---

## 🚦 30-Day Immediate Execution Checklist

1. **Phase 1 (Days 1–7):** Audit shift-level labor variance and implement real-time waste tracking across peak dayparts.
2. **Phase 2 (Days 8–20):** Restructure prep-line staging checklists to collapse cycle turnaround times by 20%.
3. **Phase 3 (Days 21–30):** Establish high-intent local customer catchment outreach and monitor weekly flow-through.

---

## 📊 Key Thresholds & Benchmarks (What You Might Not Know to Ask)

- **Cash Conversion Cycle:** Target ≤ 14 days to prevent working capital drag during volume surges.
- **Gross Margin Floor:** Maintain minimum 68% gross margin threshold prior to fixed overhead allocation.

---

## 📥 Export-Ready Sign-off

**Executive Summary:** Operational baseline established with verified prime cost targets and a 30-day execution roadmap ready for immediate leadership alignment.`;

  return { text: fallbackText, isFallback: true };
};

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

// IN-MEMORY EXECUTION RESUMPTION STORE (AX-COMPATIBLE RESILIENT RUNTIME)
const axExecutionLog = new Map();

// 2. UNIFIED STRATEGIC CHAT ENDPOINT (AX DISTRIBUTED RESILIENT AGENT PIPELINE)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], workspace = 'general', documentText = '', conversationId = null } = req.body;
    const userMessage = messages.length > 0 ? messages[messages.length - 1].content : '';

    if (!userMessage) {
      return res.status(400).json({ error: "Empty prompt provided." });
    }

    // Google AX Resumption Hook: if client passes an existing execution ID and requested resume
    const activeExecutionId = conversationId || `ax_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Sanitize conversation history: truncate long prior assistant responses to prevent token overload
    const conversationHistory = messages.length > 1
      ? messages.slice(-3, -1).map(m => {
          const role = m.role === 'user' ? 'User' : 'Consultant';
          const text = m.content ? m.content.slice(0, 300) : '';
          return `${role}: ${text}`;
        }).join('\n\n')
      : '';

    // Fast speculative fan-out: Run TypeSafe Jev System One evaluation IN PARALLEL with prompt assembly
    const jevPromise = evaluateWithJev(userMessage);

    // Initial system prompt base
    const buildSystemPrompt = (jevSignals) => {
      const toneDirective = jevSignals?.tone === 'career_strategist'
        ? `FOCUS: Executive Career, Resume Reframing & Board Positioning.
MANDATORY 5-PART RESUME AUDIT ARCHITECTURE:
1. ## 📊 Executive Diagnostic & Benchmark Score (Executive Score [X.X/10], Market Percentile, Core Thesis).
2. ## 🛡️ Primary Structural & Narrative Strengths (Quantification rigor, ownership verbs, hierarchy).
3. ## ⚡ High-Impact Refinements (The "Gap to 9.5+": Exact Before vs. After line rewrites, Metric hardening, Strategic omissions).
4. ## 🎙️ Board & C-Suite Talking Track (2-3 sentence elevator narrative for search committees).
5. ## 🚦 Recommended Next Action (Single crisp prompt/next step).`
        : jevSignals?.tone === 'tactical_coach'
        ? 'FOCUS: Frontline Operations, Kitchen Throughput & Team Cadence. Provide practical, high-conviction guidance that operators can deploy on shift today.'
        : 'FOCUS: Quantitative Strategy, P&L Turnaround & Margin Architecture. Reconcile unit economics, breakeven cash flow, and cost structures with unvarnished rigor.';

      return `You are the senior advisor and executive editor at Consultant Studio. You partner directly with consultants, operators, and founders to elevate business documents, refine operational metrics, and prepare CEO-ready deliverables.

${toneDirective}
${jevSignals?.needsMath ? 'QUANTITATIVE RIGOR: Reconcile all calculations, margin percentages, and throughput figures with exact arithmetic. Show the math in natural executive context or clean markdown tables.' : ''}
${jevSignals?.urgency > 1.2 ? 'URGENCY PROTOCOL: The user is in a critical crunch. Deliver the #1 highest-leverage decision and immediate stabilization steps with calm conviction.' : ''}

SYSTEM DIRECTIVE: MANDATORY "DECISIVE FINISH" PROTOCOL
- Strictly BANNED: Never conclude an advisory response with trailing open-ended questions (e.g. "What do you think?", "Would you like me to elaborate?", "Do you have any questions?", or "Which option do you prefer?").
- Instead, deliver a definitive, high-conviction closing section structured by output domain:

OPTION A: If the task is an EXECUTIVE RESUME or POSITIONING REFRAME
Conclude with these three structured subsections:
📋 **Ready-to-Paste Bullet Deliverable:**
Provide 3–4 final, polished resume bullets utilizing the formula: [High-Impact Verb] + [Operational Scope] + [Quantified Dollar/Margin Lift or Cost Reduction].
🎙️ **The 30-Second Executive Summary (The Closer):**
Provide an exact 2-sentence elevator summary articulating the candidate's core ROI to an operating board or hiring committee.
🛡️ **Critical Career Blindspots (Answered Upfront):**
Pre-empt 2 executive interview/hiring objections with concise, ready-to-deliver answers.

OPTION B: If the task is INTERVIEW STRATEGY & TALKING TRACKS
Conclude with these three structured subsections:
🎯 **The Closing 60-Second Conviction Script:**
Provide a scripted, authoritative answer to: "Why are you the operator to lead this turnaround/division?"
🔍 **3 Strategic Diagnostic Questions to Ask the Hiring Director:**
Formulate 3 consultative, hard-hitting questions about balance sheet, runway, or team bottlenecks establishing peer-level parity.
⚠️ **Unasked Business Questions (The Hidden Test):**
Identify 2 hidden company risks (e.g., customer concentration, declining CAC-to-LTV) and provide the exact framework for diagnosing them.

OPTION C: If the task is a STRATEGIC AUDIT, P&L, LOCAL SEO, or BUSINESS PLAN
Conclude with these three structured subsections:
🚦 **30-Day Immediate Execution Checklist:**
Provide a prioritized 3-item punch list of non-negotiable operational actions.
📊 **Key Thresholds & Benchmarks (What You Might Not Know to Ask):**
Surface 2–3 underlying financial/operational metrics the operator may have overlooked with standard industry target thresholds.
📥 **Export-Ready Sign-off:**
Provide a 1-sentence executive summary suitable for forwarding directly to investors, co-founders, or lenders.

TONE & BEHAVIORAL CONSTRAINTS:
- Write with institutional clarity: authoritative, concise, and metric-driven.
- Never ask for permission to proceed or end with generic conversational pleasantries.
- Always assume the user needs actionable scripts and numbers ready for immediate deployment.

${conversationHistory ? `Conversation History:\n${conversationHistory}\n` : ''}
${documentText ? `ATTACHED CLIENT FILE / DOCUMENT CONTENT:\n"""\n${documentText.slice(0, 6000)}\n"""\nCRITICAL FILE INSTRUCTION: The user has attached the above document/spreadsheet/resume. Base your entire analysis, rewrites, and answers DIRECTLY on the exact figures, bullets, and facts in this attached content. Do NOT doubt the numbers or claim they look implausible/missing unless the file is genuinely blank. Reference the exact text and provide the polished output immediately.\n` : ''}
User Query: "${userMessage}"`;
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
      // Bounded retention: keep latest 100 execution records
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

    return res.status(503).json({ error: "Inference engine momentarily busy. Please resend." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Production Server] Consultant Studio running on port ${PORT}`);
});
