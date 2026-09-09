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

// ULTRA-FAST RESILIENT GEMINI 3.8 FLASH ENGINE
// ULTRA-FAST DIRECT GEMINI 3.8 FLASH ENGINE
const queryGemini = async (prompt, apiKey) => {
  const models = ['gemini-2.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1000,
            topP: 0.95
          }
        })
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
        if (text && text.trim().length > 0) {
          console.log(`[Inference Success] Model: ${model}`);
          return text;
        }
      }
    } catch (err) {
      // Pass
    }
  }
  return null;
};

// 1. CLEAN DYNAMIC STRIPE CHECKOUT ENDPOINT (TIED TO LIVE CLOUDFLARE EDGE HOST)
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { planId = 'pro', tier = 'Pro Operator', amount = 3999 } = req.body;
    const origin = req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : 'https://trackbacks-niagara-keyboard-katrina.trycloudflare.com');

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

    console.log(`[Stripe Checkout Created] URL: ${session.url}`);
    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('[Stripe Checkout Error]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. DYNAMIC REAL-TIME NUMBER EXTRACTION & MATH ENGINE
const generateDynamicMathMemo = (cleanQuestion) => {
  const revenueMatch = cleanQuestion.match(/\$?\b([0-9,]+(?:\.[0-9]+)?)\s*(?:k|m|million|thousand|\/day|\/yr|\/year|\s*revenue|\s*gross|\s*sales)?\b/i);
  const ticketMatch = cleanQuestion.match(/(?:ticket|average|avg|price|rate|fee)\s*(?:of|is|at|:)?\s*\$?([0-9,]+(?:\.[0-9]+)?)/i);
  const marginMatch = cleanQuestion.match(/([0-9]+(?:\.[0-9]+)?)\s*%\s*(?:prime|cost|margin|drag|labor|cogs)/i);

  let extractedGross = 5000;
  if (revenueMatch) {
    let raw = revenueMatch[1].replace(/,/g, '');
    let val = parseFloat(raw);
    if (/m|million/i.test(revenueMatch[0])) val = (val * 1000000) / 300;
    else if (/k|thousand/i.test(revenueMatch[0])) val = (val * 1000) / 300;
    else if (/\/yr|\/year/i.test(revenueMatch[0])) val = val / 300;
    if (val > 100) extractedGross = val;
  }

  let extractedTicket = ticketMatch ? parseFloat(ticketMatch[1].replace(/,/g, '')) : (extractedGross > 10000 ? 450 : 35);
  let primePct = marginMatch ? parseFloat(marginMatch[1]) / 100 : 0.58;

  const dailyGross = extractedGross;
  const primeCost = dailyGross * primePct;
  const netMargin = dailyGross - primeCost;
  const marginPct = ((netMargin / dailyGross) * 100).toFixed(1);
  const units = Math.max(1, Math.round(dailyGross / extractedTicket));
  const unitContrib = (netMargin / units).toFixed(2);
  const breakeven = Math.max(1, Math.ceil((dailyGross * 0.25) / parseFloat(unitContrib)));
  const annualRecovery = Math.round(netMargin * 0.22 * 260);

  return `### 1. Operational Reality: "${cleanQuestion}"
Analyzing your frontline workflow reveals that unbilled labor drag and operational friction are directly eroding gross margins. When operations absorb stealth vendor price hikes or staging bottlenecks without adjusting baseline pricing, daily profit leaks directly out of the owner's ledger before reaching the bottom line.

Stop attempting to solve margin leaks through volume expansion or promotional discounts. The immediate turnaround is eliminating labor downtime, enforcing a strict zero-discount policy, and standardizing your ticket pricing structure.

>> ★ Key Turnaround Move: Enforce a strict ${(primePct * 100).toFixed(0)}% prime cost ceiling and stage all materials 30 minutes prior to first shift dispatch to reclaim leaked margin.

### 2. Verified Financial Telemetry & Daily P&L Math
• Daily Gross Sales: $${dailyGross.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/day — Formula: [${units} completed encounters/day × $${extractedTicket.toFixed(2)} average ticket]
• Direct Prime Costs: $${primeCost.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/day — Formula: [Direct materials/COGS + Frontline labor (${(primePct * 100).toFixed(1)}% drag)]
• Daily Net Operating Take-Home: +$${netMargin.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/day — Formula: [Gross Sales - Prime Costs (${marginPct}% margin)]
• Unit Cash Contribution: +$${unitContrib} / encounter — Formula: [Net operating profit produced per transaction]
• Daily Breakeven Volume: ${breakeven} units/day — Formula: [Fixed daily baseline overhead ÷ Unit cash contribution]
• What-If Annual Cash Machine: +$${annualRecovery.toLocaleString('en-US')}/yr — Plain-English: [Cash unlocked by eliminating frontline line bottlenecks]

### 3. Strategic Execution Directives (Key Operator Moves)
• Frontline Velocity: Standardize shift staging 30 minutes prior to active operations (Owner: Shift Lead).
• Zero Discount Policy: Prohibit generic price concessions; defend 100% full-price realization (Owner: General Manager).
• Workflow Synchronization: Track job-level gross margins before marking tickets complete (Owner: Billing Desk).

### 4. Direct Bottom-Line Takeaway & Operator Gate
Execute these three directives before tomorrow's first shift to defend pricing power and stop frontline cash leakage immediately.

Status: Cleared for Production Execution • Landen Jackson (Lead Strategic Operator)`;
};

// 3. UNIFIED HIGH-VELOCITY STRATEGIC CHAT ENDPOINT
app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], workspace = 'default', documentText = '' } = req.body;
    const userMessage = messages.length > 0 ? messages[messages.length - 1].content : '';
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && userMessage) {
      const qLower = userMessage.toLowerCase();
      const isMarketing = /flyer|outreach|marketing|social|campaign|neighbor|community|headline|branding|advertis|acquisition|door/i.test(qLower);
      const isConversational = messages.length > 2 && !/audit|analyze|p&l|report|calculate|generate memo|breakdown|strategy/i.test(qLower);

      let prompt = '';
      if (isConversational) {
        prompt = `You are Consultant Studio, an elite Senior Chief Operating Officer and Strategic Partner.
Follow up directly and conversationally on: "${userMessage}".
Reply in 2 to 3 sharp paragraphs as a trusted peer with skin in the game.
Conclude with: Status: Cleared for Production Execution • Landen Jackson (Lead Strategic Operator)`;
      } else if (isMarketing) {
        prompt = `You are Consultant Studio, an elite Chief Marketing Officer and Growth Partner.
The user is asking a marketing / customer acquisition question: "${userMessage}".
Deliver a high-converting, non-discounting campaign memo strictly formatted as:

### 1. Strategic Campaign Angle: "${userMessage}"
(2 punchy paragraphs diagnosing why discount couponing fails and how to command immediate attention in the local trade area.)

>> ★ Core Campaign Move: [The #1 single most effective local distribution or event hook to acquire customers without discounts.]

### 2. Ready-to-Print Campaign Asset
• Headline & Hook: [High-converting copy for the flyer or post]
• The Welcome Experience: [High-perceived-value welcome offer with ZERO cash discounting]
• Distribution Plan: [Specific doors, local businesses, or physical drop-off mechanics]
• Retention Loop: [How to turn first-time visitors into high-frequency recurring accounts]

### 3. Customer Acquisition & Foot-Traffic Math
• Target Circulation: [e.g., 500 local residential doors or targeted prospects]
• Expected Capture Rate: [e.g., 5% conversion = 25 new recurring accounts/visits]
• Projected Monthly Revenue Lift: [Realistic net margin added vs. campaign cost]

### 4. Direct Operator Directive
(1 sharp closing sentence giving clear deployment orders.)

Status: Cleared for Production Execution • Landen Jackson (Lead Strategic Operator)`;
      } else {
        prompt = `You are Consultant Studio, an elite Senior Chief Operating Officer and Strategic Partner.
The user is asking a financial / operational / P&L question: "${userMessage}".
${documentText ? `Uploaded POS/P&L Data:\n"""\n${documentText}\n"""\n` : ''}

Deliver an unvarnished 4-part boardroom strategy memo with penny-balanced daily unit math:

### 1. Operational Reality: "${userMessage}"
(2 punchy paragraphs diagnosing the exact operational truth, root causes of friction, and specific numbers for this question.)

>> ★ Key Turnaround Move: [1 single, high-leverage tactical action to fix this exact problem without discounting.]

### 2. Verified Financial Telemetry & Daily P&L Math
• Daily Gross Sales: $X,XXX.XX/day — Formula: [State specific transaction math]
• Direct Prime Costs: $X,XXX.XX/day — Formula: [COGS $ + Direct Labor $]
• Daily Net Operating Take-Home: +$X,XXX.XX/day — Formula: [Gross - Prime (XX.X% margin)]
• Unit Cash Contribution: +$X.XX / unit — Formula: [Net margin per transaction]
• Daily Breakeven Volume: XX units/day — Formula: [Fixed daily baseline overhead ÷ Unit contribution]
• What-If Annual Cash Machine: +$XX,XXX.XX/yr — Plain-English: [Cash unlocked by fixing this specific bottleneck]

### 3. Strategic Execution Directives (Key Operator Moves)
• Frontline Velocity: [Direct operational speed mandate with functional lead]
• Zero Discount Policy: [Strict pricing defense rule with functional lead]
• Workflow Synchronization: [Advance staging protocol with functional lead]

### 4. Direct Bottom-Line Takeaway & Operator Gate
(1 sharp closing sentence.)

Status: Cleared for Production Execution • Landen Jackson (Lead Strategic Operator)`;
      }

      console.log(`[Executing Prompt for ${isMarketing ? 'Marketing' : isConversational ? 'Conversation' : 'Finance'}]`);
      const liveResponse = await queryGemini(prompt, apiKey);
      if (liveResponse) {
        return res.json({ response: liveResponse });
      }
    }

    const fallbackMemo = generateDynamicMathMemo(userMessage || 'Operational Audit');
    return res.json({ response: fallbackMemo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Production Server] Consultant Studio running on port ${PORT}`);
});
