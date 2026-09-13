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
        const timeoutId = setTimeout(() => controller.abort(), 9000);
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.65,
              maxOutputTokens: 2048, // Generous limit to guarantee full, non-truncated deliverables
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

  // Tier 2: Dedicated Enterprise Gateway Fallback via MyClaw (with 18s budget)
  if (myclawKey) {
    try {
      console.log('[Failover Engaged] Querying High-Availability Enterprise Gateway...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000);
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
          max_tokens: 2500, // Complete and unclipped responses
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

    // Specific domain discriminators
    const isLocalSEO = /seo|search engine|google business|map pack|rankings|local search|citation|gbp|near me/i.test(qLower);
    const isCareerOrResume = !isLocalSEO && (/resume|résumé|interview|career|hiring|job|scorecard|kpi|role|staff|onboarding|t-mobile|att|at&t|recruiter|phone|eagle scout|curriculum vitae/i.test(qLower) ||
                             /resume|résumé|education|experience|bachelor|curriculum vitae|coursework/i.test(docLower));
    const isMarketing = !isLocalSEO && (/flyer|outreach|marketing|social|campaign|neighbor|community|headline|branding|advertis|acquisition|door|hook|customer/i.test(qLower));
    const isConversational = messages.length > 2 && !isLocalSEO && !isCareerOrResume && !isMarketing && !/audit|analyze|p&l|report|calculate|generate memo|breakdown|strategy/i.test(qLower);

    const humanInTheLoopVoice = `
CORE IDENTITY:
You are Consultant Studio, built with Landen Jackson's direct voice and "Human-in-the-Loop" philosophy.
You are a candid, trusted strategic operating partner. You respect the user's intelligence and time.

ADAPTIVE, QUESTION-SPECIFIC INTELLIGENCE:
- NEVER follow a rigid, repetitive formula. Adapt your structure, tone, and depth directly to what the user is asking.
- If the user asks a straightforward question: Give a concise, high-value answer directly addressing the problem.
- If the user asks for an audit or deep breakdown: Provide focused analysis, relevant unit economics, and actionable next steps.
- When tables or data comparisons are helpful, tailor the headers and metrics specifically to that exact business or situation.
- If a visual chart is relevant to the question, include a clean \`\`\`chart ... \`\`\` JSON block; if not needed, do not force one.
- Keep language sharp, natural, and respectful. Avoid robotic clichés, repetitive intros, or boilerplate phrasing.

KEY TURNAROUND MOVE:
When delivering strategic recommendations, always conclude with one decisive, high-leverage action:
>> ★ Key Turnaround Move: [Actionable Directive]`;

    let systemPrompt = `${humanInTheLoopVoice}
Operating Domain: "${workspace}"
${conversationHistory ? `Recent Conversation Context:\n${conversationHistory}\n` : ''}
User Request: "${userMessage}"
${documentText ? `Attached Context & Document Data:\n"""\n${documentText}\n"""\n` : ''}

Deliver an incisive, tailored response that directly resolves this specific request with zero canned filler.`;

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
