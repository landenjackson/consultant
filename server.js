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

// HIGH-VELOCITY PARALLEL INFERENCE RACE
const queryGemini = async (prompt, apiKey) => {
  const querySingle = (model) => {
    return new Promise(async (resolve) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          resolve(null);
        }, 6500);

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 1200,
              topP: 0.9
            }
          })
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
          if (text && text.trim().length > 0) {
            resolve({ model, text });
            return;
          }
        }
      } catch (err) {
        // Continue to resolve null
      }
      resolve(null);
    });
  };

  // Launch both 3.6-flash and 3.5-flash-lite simultaneously; whichever returns first wins
  const p1 = querySingle('gemini-3.6-flash');
  const p2 = querySingle('gemini-3.5-flash-lite');

  const winner = await Promise.race([
    p1.then(res => res ? res : new Promise(() => {})),
    p2.then(res => res ? res : new Promise(() => {}))
  ]).catch(() => null);

  if (winner && winner.text) {
    console.log(`[Race Winner] Delivered via ${winner.model}`);
    return winner.text;
  }

  // Backup if race didn't resolve in time
  const backup = await Promise.all([p1, p2]);
  const fallback = backup.find(b => b && b.text);
  if (fallback) return fallback.text;

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

// 2. UNIFIED STRATEGIC CHAT ENDPOINT (100% GENUINE REAL-TIME REASONING)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], workspace = 'general', documentText = '' } = req.body;
    const userMessage = messages.length > 0 ? messages[messages.length - 1].content : '';
    const apiKey = process.env.GEMINI_API_KEY;

    if (!userMessage) {
      return res.status(400).json({ error: "Empty prompt provided." });
    }

    const qLower = userMessage.toLowerCase();
    const isCareerOrResume = /resume|résumé|interview|career|hiring|job|scorecard|kpi|role|staff|onboarding|t-mobile|att|at&t|recruiter|phone/i.test(qLower);
    const isMarketing = /flyer|outreach|marketing|social|campaign|neighbor|community|headline|branding|advertis|acquisition|door|hook|customer/i.test(qLower);
    const isConversational = messages.length > 2 && !/audit|analyze|p&l|report|calculate|generate memo|breakdown|strategy/i.test(qLower);

    let systemPrompt = '';

    if (isCareerOrResume) {
      systemPrompt = `You are Consultant Studio, an elite Executive Career Strategist, Chief Operating Officer, and Leadership Advisor.
Operating Domain: "${workspace}"
User's Inquiry / Document: "${userMessage}"
${documentText ? `Attached Resume / Background Data:\n"""\n${documentText}\n"""\n` : ''}

CRITICAL EXECUTION INSTRUCTIONS:
- Directly analyze and answer the user's specific questions on resumes, interview preparation, career transitions, and role scorecards.
- Ground advice in commercial value creation (baseline -> strategic lever pulled -> quantifiable business/trust outcome).
- Present key metrics or STAR talking points in a clean, compact Markdown Table:
| Career Milestone / Target | Strategic Action / Lever | Quantifiable Outcome |
| :--- | :--- | :--- |
- Highlight the single highest-leverage career turnaround move with: >> ★ Key Turnaround Move: [Action]
- Conclude with: Status: Cleared for Production Execution • Landen Jackson (Lead Strategic Operator)`;
    } else if (isConversational) {
      systemPrompt = `You are Consultant Studio, an elite Senior Chief Operating Officer and Strategic Partner in an active boardroom conversation.
The business operator is asking: "${userMessage}".
Industry Domain: "${workspace}"

EXECUTIVE DENSITY & CLARITY DIRECTIVES:
- Directly address whatever topic the user asks (career, operations, tools, strategy, or daily execution).
- Deliver high-density, concise executive answers in 2 to 3 punchy paragraphs.
- Zero robotic fluff, zero vague generalizations.
- Conclude with: Status: Cleared for Production Execution • Landen Jackson (Lead Strategic Operator)`;
    } else if (isMarketing) {
      systemPrompt = `You are Consultant Studio, an elite Chief Marketing Officer and Growth Partner advising a business owner.
Operating Domain: "${workspace}"
Strategic Growth Directive: "${userMessage}"
${documentText ? `Attached Data / Documentation:\n"""\n${documentText}\n"""\n` : ''}

EXECUTIVE DENSITY & CLARITY DIRECTIVES:
- High-density marketing strategy with zero vague generalizations.
- Provide a compact Markdown Table detailing campaign assets, VIP offer tiers, and acquisition targets:
| Campaign Asset / Parameter | Specification | Target Standard |
| :--- | :--- | :--- |
- State the exact hook with: >> ★ Key Turnaround Move: [Action]
- Conclude with: Status: Cleared for Production Execution • Landen Jackson (Lead Strategic Operator)`;
    } else {
      systemPrompt = `You are Consultant Studio, a Senior Chief Operating Officer and Forensic Turnaround Partner.
Operating Domain: "${workspace}"
Operational & P&L Directive: "${userMessage}"
${documentText ? `Uploaded POS/P&L Data:\n"""\n${documentText}\n"""\n` : ''}

EXECUTIVE DENSITY & CLARITY DIRECTIVES:
- Open immediately with the raw commercial diagnosis in 1-2 punchy sentences.
- Provide a compact, human-readable Markdown Table detailing unit economics:
| Financial Metric | Current Daily | Target Benchmark | Variance / Recovery |
| :--- | :--- | :--- | :--- |
- Explain the breakeven equation and prime cost targets in direct business language.
- State the highest-leverage turnaround catalyst with: >> ★ Key Turnaround Move: [Action]
- Conclude with: Status: Cleared for Production Execution • Landen Jackson (Lead Strategic Operator)`;
    }

    console.log(`[Executing Live Inference for: ${isCareerOrResume ? 'Career/Resume' : isMarketing ? 'Marketing' : isConversational ? 'Conversation' : 'Operations'}]`);
    const liveResponse = await queryGemini(systemPrompt, apiKey);

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
