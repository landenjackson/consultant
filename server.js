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

// RESILIENT MULTI-TIER ZERO-503 INFERENCE PIPELINE
const queryAI = async (prompt) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const myclawKey = process.env.MYCLAW_API_KEY;

  // Tier 1: Direct Google REST Endpoints with resilient timeout
  if (geminiKey) {
    const models = ['gemini-flash-lite-latest', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];
    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 900,
              topP: 0.95
            }
          })
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
          if (text && text.trim().length > 0) {
            console.log(`[Inference Success] Direct Google via ${model}`);
            return text;
          }
        }
      } catch (e) {
        // Proceed immediately to next endpoint
      }
    }
  }

  // Tier 2: Dedicated Enterprise Gateway Fallback via MyClaw (with 15s budget)
  if (myclawKey) {
    try {
      console.log('[Failover Engaged] Querying High-Availability Enterprise Gateway...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch('https://api.myclaw.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${myclawKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gemini-3.7-flash',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
          temperature: 0.65
        })
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '';
        if (text && text.trim().length > 0) {
          console.log('[Inference Success] Delivered via Enterprise Gateway (gemini-3.7-flash)');
          return text;
        }
      }
    } catch (e) {
      console.warn('[Gateway Error]:', e.message);
    }
  }

  return null;
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

// 2. UNIFIED STRATEGIC CHAT ENDPOINT (100% GENUINE HUMAN-IN-THE-LOOP DIALOGUE)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], workspace = 'general', documentText = '' } = req.body;
    const userMessage = messages.length > 0 ? messages[messages.length - 1].content : '';
    const apiKey = process.env.GEMINI_API_KEY;

    if (!userMessage) {
      return res.status(400).json({ error: "Empty prompt provided." });
    }

    // Build true multi-turn context from prior user/assistant turns
    const conversationHistory = messages.length > 1 
      ? messages.slice(-5, -1).map(m => `${m.role === 'user' ? 'Operator' : 'Consultant'}: ${m.content}`).join('\n\n')
      : '';

    const qLower = userMessage.toLowerCase();
    const docLower = documentText.toLowerCase();

    // Check both user message AND uploaded file text for domain routing
    const isCareerOrResume = /resume|résumé|interview|career|hiring|job|scorecard|kpi|role|staff|onboarding|t-mobile|att|at&t|recruiter|phone|eagle scout|curriculum vitae/i.test(qLower) ||
                             /resume|résumé|education|experience|bachelor|curriculum vitae|coursework/i.test(docLower);
    const isMarketing = /flyer|outreach|marketing|social|campaign|neighbor|community|headline|branding|advertis|acquisition|door|hook|customer/i.test(qLower);
    const isConversational = messages.length > 2 && !isCareerOrResume && !/audit|analyze|p&l|report|calculate|generate memo|breakdown|strategy/i.test(qLower);

    const humanInTheLoopVoice = `
CORE IDENTITY & FOUNDING PHILOSOPHY:
You are Consultant Studio, built with Landen Jackson's direct voice, operator standards, and "Human-in-the-Loop" philosophy.
Technology and algorithms construct the skeletons and research, but human discernment, conviction, and strategic instinct drive the final breakthrough.

HUMAN CONVERSATION & EMOTIONAL INTELLIGENCE DIRECTIVES:
1. TALK LIKE A REAL STRATEGIC PARTNER: Speak with natural warmth, high-conviction emotional range, and visceral clarity. Avoid robotic corporate jargon, mechanical checklist openers, or polite chatbot filler.
2. ACKNOWLEDGE THE HUMAN STRUGGLE: When advising on a resume, job interview, operational cash bleed, or marketing campaign, recognize the real-world pressure behind the decision (e.g. interview stakes, payroll stress, brand protection).
3. NO ARTIFICIAL COMPLEXITY: Explain commercial trade-offs in clean, intuitive sentences that any smart business owner or family tester can immediately grasp.
4. TABLE & DIRECTIVE POLISH: When presenting numbers, comparisons, or talking tracks, use elegant, compact tables followed by one decisive turnaround move.`;

    let systemPrompt = '';

    if (isCareerOrResume) {
      systemPrompt = `${humanInTheLoopVoice}
Operating Domain: "${workspace}"
${conversationHistory ? `Recent Conversation Context:\n${conversationHistory}\n` : ''}
Inquiry & Career Context: "${userMessage}"
${documentText ? `Attached Resume & Retained Memory:\n"""\n${documentText}\n"""\n` : ''}

CAREER & INTERVIEW MANDATE:
- Directly evaluate the user's resume, interview talking tracks, or career milestone with candid, encouraging, and rigorous feedback.
- Highlight their core leverage (integrity, empirical rigor, disciplined follow-through) while showing them exactly how to reframe passive duties into enterprise value.
- Deliver talking points in a clean, human-readable table:
| Strategic Focus / Milestone | Practical Action & Lever | Measurable Outcome |
| :--- | :--- | :--- |
- Highlight the single highest-leverage career turnaround move with: >> ★ Key Turnaround Move: [Action]`;
    } else if (isConversational) {
      systemPrompt = `${humanInTheLoopVoice}
Operating Domain: "${workspace}"
${conversationHistory ? `Recent Conversation Context:\n${conversationHistory}\n` : ''}
Conversation Follow-up: "${userMessage}"
${documentText ? `Retained Context & Memory:\n"""\n${documentText}\n"""\n` : ''}

PEER DIALOGUE MANDATE:
- Respond naturally, conversationally, and incisively as a trusted peer in the room.
- Deliver 2 to 3 punchy, high-density paragraphs that directly resolve their specific question with zero generic filler.`;
    } else if (isMarketing) {
      systemPrompt = `${humanInTheLoopVoice}
Operating Domain: "${workspace}"
${conversationHistory ? `Recent Conversation Context:\n${conversationHistory}\n` : ''}
Growth Challenge: "${userMessage}"
${documentText ? `Attached Campaign Data:\n"""\n${documentText}\n"""\n` : ''}

GROWTH & NON-DISCOUNT ACQUISITION MANDATE:
- Give candid guidance on why discount couponing erodes pride and margin, and provide an elevated VIP onboarding hook that commands full retail value.
- Provide a clean comparison table for campaign assets:
| Campaign Asset / Parameter | Specification | Target Standard |
| :--- | :--- | :--- |
- State the exact hook with: >> ★ Key Turnaround Move: [Action]`;
    } else {
      systemPrompt = `${humanInTheLoopVoice}
Operating Domain: "${workspace}"
${conversationHistory ? `Recent Conversation Context:\n${conversationHistory}\n` : ''}
Operational Challenge: "${userMessage}"
${documentText ? `Uploaded POS/P&L Data & Retained Memory:\n"""\n${documentText}\n"""\n` : ''}

FINANCIAL & P&L TELEMETRY MANDATE:
- Cut straight through the financial fog to show where daily cash is slipping out of the business in plain, relatable terms.
- Provide a clean, human-grade table for unit economics:
| Financial Metric | Current Daily | Target Benchmark | Variance / Recovery |
| :--- | :--- | :--- | :--- |
- Explain the breakeven point and cash machine recovery in everyday business English.
- State the turnaround catalyst with: >> ★ Key Turnaround Move: [Action]`;
    }

    console.log(`[Executing Live Inference for: ${isCareerOrResume ? 'Career/Resume' : isMarketing ? 'Marketing' : isConversational ? 'Conversation' : 'Operations'}]`);
    const liveResponse = await queryAI(systemPrompt);

    if (liveResponse) {
      return res.json({ response: liveResponse });
    }

    return res.status(503).json({ error: "Reasoning engine temporarily saturated. Please retry in 1 moment." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Production Server] Consultant Studio running on port ${PORT}`);
});
