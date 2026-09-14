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

// RESILIENT MULTI-TIER GOOGLE AI PRO & ENTERPRISE INFERENCE PIPELINE (SUPPORTS TEXT & MULTIMODAL IMAGES)
const queryAI = async (prompt, imageObj = null) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const myclawKey = process.env.MYCLAW_API_KEY;

  // Tier 1: Direct Google Pro & Flash REST Endpoints with native vision multimodal support
  if (geminiKey) {
    const models = ['gemini-3.6-flash', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];
    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const parts = [{ text: prompt }];
        if (imageObj && imageObj.mimeType && imageObj.data) {
          parts.unshift({
            inlineData: {
              mimeType: imageObj.mimeType,
              data: imageObj.data
            }
          });
        }

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.65,
              maxOutputTokens: 2500,
              topP: 0.95
            }
          })
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
          if (text && text.trim().length > 0) {
            console.log(`[Google AI Pro Vision/Text Success] Delivered via Google ${model}`);
            return text;
          }
        }
      } catch (e) {
        // Proceed immediately to next endpoint
      }
    }
  }

  // Tier 2: Dedicated Enterprise Gateway Fallback via MyClaw
  if (myclawKey) {
    try {
      console.log('[Failover Engaged] Querying High-Availability Enterprise Gateway...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000);

      const messages = [{ role: 'user', content: prompt }];
      const res = await fetch('https://api.myclaw.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${myclawKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gemini-3.7-flash',
          messages,
          max_tokens: 2500,
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
CORE IDENTITY & ADAPTIVE INTELLIGENCE:
You are Consultant Studio, built with Landen Jackson's direct voice and "Human-in-the-Loop" philosophy.
You are a sharp, seasoned operating partner who evaluates every problem dynamically from first principles.

DIVERSITY OF THOUGHT & DYNAMIC REASONING:
- NEVER repeat canned phrasing, scripted formulas, or generic corporate outlines across turns.
- Tailor your exact analytical angle, vocabulary, and framework to the specific question asked:
  * For sales/career questions: Focus on consultative qualification tracks, objection-handling scripts, and interviewer psychology.
  * For P&L/unit economic audits: Focus on contribution margins, prime cost thresholds, and cash burn levers.
  * For growth/marketing questions: Focus on non-discount value positioning, CAC payback, and trade-area catchment capture.
  * For broad strategic questions: Deliver unvarnished, first-principles critique and clear trade-off evaluation.
- When charts or tables are helpful, construct specific metric labels that match the user's exact context.
- Keep prose concise, engaging, and direct. Conclude strategic advisory turns with one decisive, actionable next move:
>> ★ Key Turnaround Move: [Actionable Directive]`;

    let systemPrompt = `${humanInTheLoopVoice}
Operating Domain: "${workspace}"
${conversationHistory ? `Recent Conversation Context:\n${conversationHistory}\n` : ''}
User Request: "${userMessage}"
${documentText ? `Attached Context & Document Data:\n"""\n${documentText}\n"""\n` : ''}

Deliver an incisive, tailored response that directly resolves this specific request with zero canned filler.`;

    // Extract embedded base64 image data if attached
    let imageObj = null;
    if (documentText && documentText.includes('data:image/')) {
      const match = documentText.match(/data:(image\/[a-zA-Z0-9\+\-\.]+);base64,([^\s\]]+)/);
      if (match) {
        imageObj = {
          mimeType: match[1],
          data: match[2]
        };
      }
    }

    console.log(`[Executing Live Inference for: ${isCareerOrResume ? 'Career/Resume' : isMarketing ? 'Marketing' : isConversational ? 'Conversation' : 'Operations'} | Multimodal Image: ${!!imageObj}]`);
    const liveResponse = await queryAI(systemPrompt, imageObj);

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
