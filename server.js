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

// HIGH-SPEED RESILIENT GOOGLE AI PRO & ENTERPRISE INFERENCE PIPELINE (FAST 3-5s TARGET)
const queryAI = async (prompt, imageObjs = []) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const myclawKey = process.env.MYCLAW_API_KEY;

  // Tier 1: Direct Google High-Velocity Endpoints (gemini-2.5-flash / gemini-3.6-flash / flash-lite) with aggressive 4s timeout
  if (geminiKey) {
    const models = ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite'];
    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500); // Strict 4.5s budget per tier

        const parts = [{ text: prompt }];
        if (Array.isArray(imageObjs) && imageObjs.length > 0) {
          imageObjs.slice(0, 10).forEach(img => {
            if (img && img.mimeType && img.data) {
              parts.unshift({
                inlineData: {
                  mimeType: img.mimeType,
                  data: img.data
                }
              });
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
              temperature: 0.6,
              maxOutputTokens: 1500, // Faster token generation
              topP: 0.95
            }
          })
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
          if (text && text.trim().length > 0) {
            console.log(`[Google AI Pro Vision/Text Success] Delivered via Google ${model} (${imageObjs.length} images attached)`);
            return text;
          }
        }
      } catch (e) {
        // Proceed immediately to next fast endpoint
      }
    }
  }

  // Tier 2: Dedicated Enterprise Gateway Fallback via MyClaw with 5s budget
  if (myclawKey) {
    try {
      console.log('[Failover Engaged] Querying High-Availability Enterprise Gateway...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

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
          max_tokens: 1500,
          temperature: 0.6
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

STRICT ZERO-CODE RULE FOR EXECUTIVE AUDIENCES:
- NEVER output raw ASCII pseudo-graphs, box-drawing tree diagrams (e.g., '[Day 1-30] | ├── Stop Cash Bleed...'), code blocks (\`\`\` or \`\`\`json), or raw unformatted JSON.
- Business operators and executive audiences HATE reading code syntax, orphaned brackets, or ASCII tree art.
- If presenting a timeline, phase breakdown, or structured plan, write it as clean, polished bullet points or bolded phase milestones—never pseudo-code blocks.
- If presenting data metrics, use clean Markdown tables or standard \`\`\`chart ... \`\`\` JSON blocks which the browser renders automatically into interactive visual charts.

DIVERSITY OF THOUGHT & DYNAMIC REASONING:
- NEVER repeat canned phrasing, rigid "Phase 1 / Phase 2 / Phase 3" boilerplate, or generic corporate outlines across turns.
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

    console.log(`[Executing Live Inference for: ${isCareerOrResume ? 'Career/Resume' : isMarketing ? 'Marketing' : isConversational ? 'Conversation' : 'Operations'} | Multimodal Images: ${imageObjs.length}]`);
    const liveResponse = await queryAI(systemPrompt, imageObjs);

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
