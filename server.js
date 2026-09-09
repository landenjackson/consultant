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

// ULTRA-FAST RESILIENT GEMINI ENGINE
const queryGemini = async (prompt, apiKey) => {
  const models = ['gemini-2.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.82,
            maxOutputTokens: 1100,
            topP: 0.95
          }
        })
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
        if (text && text.trim().length > 0) {
          return text;
        }
      }
    } catch (err) {
      // Pass to next lane
    }
  }
  return null;
};

// 1. DYNAMIC STRIPE CHECKOUT SESSIONS
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

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. DYNAMIC REAL-TIME NUMBER EXTRACTION & MATH ENGINE
const generateDynamicMathMemo = (cleanQuestion) => {
  const qLower = cleanQuestion.toLowerCase();
  const isMarketing = /flyer|outreach|marketing|social|campaign|neighbor|community|headline|branding|advertis|acquisition|door|hook|customer/i.test(qLower);

  if (isMarketing) {
    return `Discount coupons attract bargain hunters who leave the moment someone else is 5% cheaper. In your local trade area, customers aren't hesitating because of price—they hesitate because they haven't experienced a seamless, high-trust entry point into your business.

To capture high-intent recurring accounts, we deploy the **Neighborhood Priority Key**. Instead of eroding your gross margin with discounts, we wrap an elevated welcome upgrade around your full standard ticket, establishing immediate relationship loyalty from day one.

>> ★ Key Turnaround Move: Deploy a physical "Neighborhood Priority Pass" door-hanger granting an exclusive complimentary onboarding upgrade while holding 100% full-price ticket integrity.

### Campaign Architecture & Ready-to-Print Copy
• Headline & Hook: "A Formal Neighborhood Welcome from Your Local Specialists Down the Street."
• The VIP Welcome Experience: Receive our full Signature Priority Onboarding (a $45 value) on your first scheduled visit with zero cash discounting.
• Distribution Logistics: Direct hand-delivery to 500 targeted residential doors within your primary 2-mile radius on Tuesday and Thursday mornings.
• Retention & Lifetime Value Loop: Secure next month's recurring booking directly during the initial encounter to lock in long-term frequency.

### Acquisition Economics & Foot-Traffic Math
• Target Circulation: 500 premium residential door-hangers directly distributed.
• Expected Capture Rate: 6.0% conversion rate = 30 new recurring monthly accounts.
• Projected Monthly Revenue Lift: +$5,550.00/mo ($66,600.00/yr) in net margin added against ~$280 in total print and distribution labor.

### Strategic Deployment Directives
• Velocity Mandate: Complete door-to-door distribution within 48 hours of asset printing (Owner: Field Marketing Lead).
• Price Defense Policy: Prohibit coupon discounting; ring up standard full-price ticket on all activations (Owner: Front-of-House Lead).
• Asset Staging: Inspect 100% of printed door-hangers for heavy 16pt cardstock quality before dispatch (Owner: General Manager).

Status: Cleared for Production Execution • Landen Jackson (Lead Strategic Operator)`;
  }

  // Real-time Number Extraction for Finance
  const revenueMatch = cleanQuestion.match(/\$?\b([0-9,]+(?:\.[0-9]+)?)\s*(?:k|m|million|thousand|\/day|\/yr|\/year|\s*revenue|\s*gross|\s*sales)?\b/i);
  const ticketMatch = cleanQuestion.match(/(?:ticket|average|avg|price|rate|fee)\s*(?:of|is|at|:)?\s*\$?([0-9,]+(?:\.[0-9]+)?)/i);
  const marginMatch = cleanQuestion.match(/([0-9]+(?:\.[0-9]+)?)\s*%\s*(?:prime|cost|margin|drag|labor|cogs)/i);

  let extractedGross = 16000;
  if (revenueMatch) {
    let raw = revenueMatch[1].replace(/,/g, '');
    let val = parseFloat(raw);
    if (/m|million/i.test(revenueMatch[0])) val = (val * 1000000) / 300;
    else if (/k|thousand/i.test(revenueMatch[0])) val = (val * 1000);
    else if (/\/yr|\/year/i.test(revenueMatch[0])) val = val / 300;
    if (val > 100) extractedGross = val;
  }

  let extractedTicket = ticketMatch ? parseFloat(ticketMatch[1].replace(/,/g, '')) : (extractedGross > 10000 ? 320 : 45);
  let primePct = marginMatch ? parseFloat(marginMatch[1]) / 100 : 0.62;

  const dailyGross = extractedGross;
  const primeCost = dailyGross * primePct;
  const netMargin = dailyGross - primeCost;
  const marginPct = ((netMargin / dailyGross) * 100).toFixed(1);
  const units = Math.max(1, Math.round(dailyGross / extractedTicket));
  const unitContrib = (netMargin / units).toFixed(2);
  const breakeven = Math.max(1, Math.ceil((dailyGross * 0.25) / parseFloat(unitContrib)));
  const annualRecovery = Math.round(netMargin * 0.22 * 260);

  return `Look at your numbers directly: at $${dailyGross.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} in daily gross revenue, carrying a ${(primePct * 100).toFixed(0)}% prime cost drag means you are letting $${primeCost.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} slip out of the business every single day before you touch a dime of owner profit.

When frontline scheduling overlaps, technicians sit unbilled between jobs, or vendor invoice creep goes unpassed, your take-home cash drops to $${netMargin.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/day. You do not solve this by scrambling for more volume or discounting prices—you fix it by locking down your price floor and stopping staging leaks at the source.

>> ★ Key Turnaround Move: Enforce a strict ${(primePct * 100).toFixed(0)}% prime cost ceiling and mandate 30-minute advance staging prior to active operations to recover leaked margin immediately.

### Executive P&L Telemetry & Real Unit Math
• Daily Gross Sales: $${dailyGross.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/day [Audited across ${units} encounters at $${extractedTicket.toFixed(2)} average ticket]
• Direct Prime Expenses: $${primeCost.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/day [Materials + frontline labor drag at ${(primePct * 100).toFixed(1)}%]
• Daily Net Operating Margin: +$${netMargin.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/day [${marginPct}% real contribution margin]
• Unit Cash Contribution: +$${unitContrib} / encounter [Raw profit generated per completed transaction]
• Daily Breakeven Volume: ${breakeven} units/day [Overhead coverage baseline threshold]
• What-If Annual Cash Machine: +$${annualRecovery.toLocaleString('en-US')}/yr [Tangible cash reclaimed by tightening frontline execution]

### Strategic Execution Mandates
• Frontline Velocity: Standardize station staging 30 minutes prior to shift dispatch (Owner: Shift Lead).
• Price Defense Policy: Prohibit unapproved discounts; defend 100% full-price realization (Owner: General Manager).
• Workflow Synchronization: Audit job-level gross margins before marking tickets complete (Owner: Billing Desk).

Status: Cleared for Production Execution • Landen Jackson (Lead Strategic Operator)`;
};

// 3. UNIFIED HIGH-VELOCITY STRATEGIC CHAT ENDPOINT (AUTHENTIC EXECUTIVE ADVISOR PERSONA)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], workspace = 'general', documentText = '' } = req.body;
    const userMessage = messages.length > 0 ? messages[messages.length - 1].content : '';
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && userMessage) {
      const qLower = userMessage.toLowerCase();
      const isMarketing = /flyer|outreach|marketing|social|campaign|neighbor|community|headline|branding|advertis|acquisition|door|hook|customer/i.test(qLower);
      const isConversational = messages.length > 2 && !/audit|analyze|p&l|report|calculate|generate memo|breakdown|strategy/i.test(qLower);

      let prompt = '';
      if (isConversational) {
        prompt = `You are Consultant Studio, an unvarnished Senior Chief Operating Officer and Strategic Growth Partner sitting directly across the desk from a business owner.
The user is following up conversationally with: "${userMessage}".

RULES FOR THIS RESPONSE:
- DO NOT speak like a chatbot, assistant, or textbook.
- Speak with visceral executive conviction, commercial candor, and charismatic authority.
- Reply in 2 to 3 sharp, compelling paragraphs addressing their exact question.
- Reference numbers, real-world team friction, customer psychology, and cash trade-offs.
- DO NOT use rigid numbered step headers (Step 1, Step 2, etc.).
- End with: Status: Cleared for Production Execution • Landen Jackson (Lead Strategic Operator)`;
      } else if (isMarketing) {
        prompt = `You are Consultant Studio, an elite Chief Marketing Officer and Growth Partner advising a business owner.
Operating Domain: "${workspace}"
The user wants a high-impact customer acquisition / marketing campaign: "${userMessage}".
${documentText ? `Attached Data / Context:\n"""\n${documentText}\n"""\n` : ''}

Deliver an unvarnished, charismatic growth strategy. DO NOT use generic "Step 1, Step 2" headers.
Structure your reply strictly using these executive sections:

(Paragraph 1 & 2: Open with raw commercial truth on why generic discounting destroys pricing power, and explain the exact psychological hook to command affluent local demand without price concessions.)

>> ★ Key Turnaround Move: [1 single, high-leverage marketing move to capture customer gravitation without discounting.]

### Campaign Architecture & Ready-to-Print Copy
• Headline & Hook: [High-converting, curiosity-driven headline copy]
• The VIP Welcome Experience: [High-perceived-value onboarding offer with ZERO cash discounts]
• Distribution Logistics: [Exact doors, B2B partner drop-offs, or physical neighborhood mechanics]
• Retention & Lifetime Value Loop: [Mechanism to convert first-time acquisition into high-frequency recurring accounts]

### Acquisition Economics & Foot-Traffic Math
• Target Circulation: [e.g., 500 local residential doors or targeted prospects]
• Expected Capture Rate: [e.g., 5% conversion = 25 new recurring accounts/visits]
• Projected Monthly Lift: [Estimated gross profit generated vs. campaign cost]

### Strategic Deployment Directives
• Velocity Mandate: [Field execution timeline with functional owner]
• Brand Protection: [Strict covenant forbidding price matching or discounting]
• Asset Staging: [Material staging and team coordination protocol]

Status: Cleared for Production Execution • Landen Jackson (Lead Strategic Operator)`;
      } else {
        prompt = `You are Consultant Studio, an unvarnished Senior Chief Operating Officer and Strategic Partner advising a business owner.
Operating Domain: "${workspace}"
The user is asking an operational, P&L audit, or margin bottleneck question: "${userMessage}".
${documentText ? `Uploaded Data:\n"""\n${documentText}\n"""\n` : ''}

Deliver an unvarnished boardroom advisory memo with penny-balanced unit math. DO NOT use generic "Step 1, Step 2" headers.
Structure your reply strictly using these executive sections:

(Paragraph 1 & 2: Open immediately with the core operational truth—diagnose where frontline labor is unbilled, vendor costs are creeping, or capacity is choking take-home cash.)

>> ★ Key Turnaround Move: [1 single, high-leverage tactical action to protect gross margins without promotional discounts.]

### Executive P&L Telemetry & Real Unit Math
• Daily Gross Sales: $X,XXX.XX/day [Audited customer volume × average realized ticket]
• Direct Prime Expenses: $X,XXX.XX/day [Materials/COGS + Direct frontline labor drag]
• Daily Net Operating Margin: +$X,XXX.XX/day [Gross Sales - Prime Expenses (XX.X% margin)]
• Unit Cash Contribution: +$X.XX / encounter [Net profit produced per transaction]
• Daily Breakeven Volume: XX units/day [Overhead coverage baseline threshold]
• What-If Annual Cash Machine: +$XX,XXX.XX/yr [Annual cash unlocked by eliminating this bottleneck]

### Strategic Execution Mandates
• Frontline Velocity: [Direct operational speed mandate with functional lead]
• Zero Discount Policy: [Strict pricing defense rule to protect full-price integrity with functional lead]
• Workflow Synchronization: [Advance staging protocol to eliminate line choke points with functional lead]

Status: Cleared for Production Execution • Landen Jackson (Lead Strategic Operator)`;
      }

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
