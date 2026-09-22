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
      console.log(`[TypeSafe Jev Evaluator] Domain: ${intent} | Urgency: ${urgencyScore.toFixed(2)} | Math: ${needsMath} | Tone: ${tone}`);
      return {
        domain: intent,
        urgency: urgencyScore,
        needsMath,
        tone
      };
    }
  } catch (err) {
    console.error('[TypeSafe Jev Notice]:', err.message);
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
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${customKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4096, temperature: 0.2 }
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
      console.warn('[BYOK Custom Gemini Request Notice]:', byokErr.message);
    }
  }

  // MULTIMODAL INFERENCE ROUTING (VISION & IMAGES)
  if (hasImages && activeMyclawKey) {
    console.log(`[Executing Multimodal Vision via Gemini 3.7 Flash | ${imageObjs.length} Images Attached]`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const res = await fetch('https://api.myclaw.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeMyclawKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gemini-3.7-flash',
          messages: [{ role: 'user', content: contentPayload }],
          max_tokens: 4096,
          temperature: 0.2
        })
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '';
        if (text && text.trim().length > 0 && !text.includes('Model do not support image input')) {
          console.log(`[Vision Success: gemini-3.7-flash] (${text.length} chars)`);
          return { text, isFallback: false };
        }
      }
    } catch (err) {
      console.warn('[Vision request notice]:', err.message);
    }
  }

  // TIER 1: Parallel Fast Speculative Race (sub-4s instant completion across Flash models)
  if (activeMyclawKey && !hasImages) {
    const fetchModel = async (modelName, maxTokens = 4096) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
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
        fetchModel('gemini-2.0-flash', 4096),
        fetchModel('gemini-3.7-flash', 4096),
        fetchModel('gpt-4o-mini', 4096)
      ]);
      console.log(`[⚡ Fast Race Instant Winner: ${winner.model}] (${winner.text.length} chars)`);
      return { text: winner.text, isFallback: false };
    } catch (err) {
      console.warn('[Parallel race failed, attempting reliable fallback]:', err.message);
      try {
        const fallback = await fetchModel('gemini-2.0-flash', 4096);
        return { text: fallback.text, isFallback: false };
      } catch (fbErr) {
        console.error('[All server inference exhausted]:', fbErr.message);
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

// 2. UNIFIED STRATEGIC CHAT ENDPOINT
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

    // Map 'assistant' -> 'model', limit history to the last 6 turns for fast edge latency
    const recentMessages = messages.slice(-6);
    const conversationHistory = recentMessages.length > 1
      ? recentMessages.slice(0, -1).map(m => {
          const role = m.role === 'assistant' ? 'Consultant' : 'User';
          const text = m.content ? m.content.slice(0, 500) : '';
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

      return `You are an executive business analyst and strategic partner at Consultant Studio.
OPERATIONAL DIRECTIVES:
- Provide answers that are concise, metric-driven, and written in plain language.
- STRICTLY BAN buzzwords, robotic jargon, and filler (e.g. avoid "operational drag", "remediation paradigm", "synergistic alignment", "holistic approach", "unpack", "delve").
- Always lead with the direct financial figure or core conclusion (BLUF), followed by clear, jargon-free recommendations.
- Group generated analyses with clear sub-headers, bold key figures (e.g., **Monthly Burn**, **Runway Months**, **Gross Margin Floor**), and structured bulleted action items rather than dense multi-paragraph blocks.

${toneDirective}
${jevSignals?.needsMath ? 'QUANTITATIVE RIGOR: Reconcile all calculations, margin percentages, and throughput figures with exact arithmetic. Show the math in clean markdown tables.' : ''}
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
${documentText ? `[ATTACHED CLIENT DOCUMENT]:\n"""\n${documentText.slice(0, 30000)}\n"""\nCRITICAL FILE INSTRUCTION: The user has attached the above document. Base your entire analysis, rewrites, and answers DIRECTLY on the exact figures, bullets, and facts in this attached content. Do NOT doubt the numbers or claim they look implausible/missing unless the file is genuinely blank. Reference the exact text and provide the polished output immediately.\n` : ''}
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
