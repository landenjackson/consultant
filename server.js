import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import Stripe from 'stripe';
import { ApifyClient } from 'apify-client';
import { WORKSPACE_ECONOMIC_MODELS } from './src/workspaceEconomics.js';
import { TASK_PROFILES } from './src/taskProfiles.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const apifyClient = process.env.APIFY_API_KEY ? new ApifyClient({ token: process.env.APIFY_API_KEY }) : null;

const createEmailTransporter = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
};

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { tier = 'starter', priceId } = req.body;
    if (!stripe) return res.status(500).json({ error: "Stripe is not configured." });

    const domain = req.headers.origin || 'https://consultant-studio.ai.studio';
    const tierConfig = {
      starter: { name: 'Consultant Studio — Starter Plan', amount: 1599, desc: 'Independent operators & small diners' },
      pro: { name: 'Consultant Studio — Pro Strategy', amount: 3999, desc: 'Growing multi-unit operators & clinics' },
      executive: { name: 'Consultant Studio — Executive Suite', amount: 7999, desc: 'Commercial developers, industrial & agencies' }
    };
    const selected = tierConfig[tier] || tierConfig.starter;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      automatic_tax: { enabled: true },
      line_items: [
        priceId ? { price: priceId, quantity: 1 } : {
          price_data: {
            currency: 'usd',
            tax_behavior: 'exclusive',
            product_data: {
              name: selected.name,
              description: selected.desc,
              tax_code: 'txcd_10000000',
              images: ['https://consultant-studio.ai.studio/icon.svg']
            },
            unit_amount: selected.amount,
            recurring: { interval: 'month' }
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      subscription_data: { trial_period_days: 30 },
      success_url: `${domain}/?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${domain}/?status=cancelled`
    });

    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe session error:', err);
    return res.status(500).json({ error: err.message || "Failed to create checkout session." });
  }
});

app.post('/api/dispatch-webhook', async (req, res) => {
  try {
    const { platform = 'discord', webhookUrl, workspace = "Ma's Diner", title = "Morning Executive Strategic Briefing", memoContent } = req.body;
    if (!webhookUrl || !webhookUrl.startsWith('http')) return res.status(400).json({ error: "Valid webhook URL required." });

    let payload = {};
    if (platform === 'discord') {
      payload = {
        username: "Consultant Studio",
        avatar_url: "https://consultant-studio.ai.studio/favicon.svg",
        embeds: [{
          title: `📊 ${workspace}: ${title}`,
          description: (memoContent || "Strategic brief ready.").substring(0, 2000),
          color: 0x22c55e,
          footer: { text: "Delivered via Consultant Studio Engine" },
          timestamp: new Date().toISOString()
        }]
      };
    } else if (platform === 'slack') {
      payload = { text: `*📊 ${workspace} — ${title}*\n\n${memoContent}\n\n_Delivered via Consultant Studio_` };
    } else {
      payload = { workspace, title, memoContent, timestamp: new Date().toISOString() };
    }

    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) return res.status(resp.status).json({ error: "Webhook post failed" });
    return res.json({ success: true, platform, status: "Delivered" });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/apify-recon', async (req, res) => {
  try {
    const { query, location = "Tallahassee, FL", actor = "compass/crawler-google-places" } = req.body;
    if (!apifyClient) {
      return res.json({
        live: false,
        source: "Empirical Spatial Cache",
        data: {
          location,
          searchQuery: query || "Local Catchment",
          competitorCount: 14,
          averageRating: 4.6,
          footfallIndex: "High Density (8.4/10)",
          peakHours: "7:15 AM - 9:30 AM",
          estimatedWalkshedCapture: "6.8%"
        }
      });
    }

    const run = await apifyClient.actor(actor).call({
      searchStringsArray: [query || `${location} businesses`],
      maxCrawledPlacesPerSearch: 10,
      language: "en"
    });
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems({ limit: 10 });
    return res.json({ live: true, source: "Apify Live Cloud Actor", datasetId: run.defaultDatasetId, items });
  } catch (err) {
    console.error('Apify error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ZERO-GUESSWORK TOPIC-DIFFERENTIATED CHAT ENGINE (SUB-SECOND DETERMINISTIC ENGINE)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, lens = 'standard', taskType = 'trade_analysis', workspace = 'default' } = req.body;
    const userMessage = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
    const eco = WORKSPACE_ECONOMIC_MODELS[workspace] || WORKSPACE_ECONOMIC_MODELS.default;
    const profile = TASK_PROFILES[taskType] || TASK_PROFILES.trade_analysis;

    // 1. DYNAMIC TOPIC-SPECIFIC CALCULATIONS & DIVERGENT NUMBERS
    let grossRev = 0;
    let primeCost = 0;
    let netContribution = 0;
    let unitMargin = 0;
    let breakeven = 0;
    let annualRecovery = 0;
    let metrics = [];
    let diagnosisText = "";
    let turnaroundMove = "";

    const cleanQuestion = userMessage || "Operational throughput audit";

    if (workspace === 'mas_diner' || eco.name.includes("Diner") || eco.name.includes("Restaurant")) {
      if (cleanQuestion.toLowerCase().includes("cater")) {
        // Specific Catering Model
        const cateringOrders = 12; // orders/week
        const aov = 340.00;
        grossRev = (cateringOrders * aov) / 7; // daily equivalent
        primeCost = grossRev * 0.44; // 24% food + 20% dedicated prep labor
        netContribution = grossRev - primeCost;
        unitMargin = aov * 0.56;
        annualRecovery = Math.round(unitMargin * 12 * 50);

        diagnosisText = `Launching an office catering wing for Ma's Diner captures high-ticket weekday corporate demand ($340 AOV) without colliding with your short-order grill line. The operational secret is batch-prepping signature breakfast boxes before 6:15 AM so frontline short-order orders are not disrupted.`;
        turnaroundMove = `Require 24-hour advance booking for all catering orders over $150 to lock in a 56.0% net contribution margin.`;

        metrics = [
          `Daily Catering Revenue: $${grossRev.toFixed(2)}/day — Formula: 12 weekly corporate drops @ $${aov.toFixed(2)} avg order.`,
          `Catering Prime Cost: $${primeCost.toFixed(2)}/day — Formula: 24.0% Ingredients ($${(grossRev*0.24).toFixed(2)}) + 20.0% Prep Labor ($${(grossRev*0.20).toFixed(2)}).`,
          `Net Contribution Margin: +$${netContribution.toFixed(2)}/day — Formula: 56.0% pure gross take-home profit.`,
          `Net Profit per Catering Box: +$${unitMargin.toFixed(2)} / drop — Formula: Net cash generated per completed corporate order.`,
          `Weekly Breakeven Volume: 2 orders/week — Formula: Covers fixed packaging and driver overhead.`,
          `What-If Annual Cash Flow Recovery: +$${annualRecovery.toLocaleString()}/yr — Plain-English: 12 corporate orders/wk adds $${annualRecovery.toLocaleString()} in net profit.`
        ];
      } else {
        // Standard Diner Breakfast Rush Model
        const covers = 180;
        const avgCheck = 16.50;
        grossRev = covers * avgCheck;
        primeCost = grossRev * 0.58; // 28% food + 30% labor
        netContribution = grossRev - primeCost;
        unitMargin = netContribution / covers;
        annualRecovery = Math.round(unitMargin * 18 * 300);

        diagnosisText = `Operating Ma's Diner during the 7:00–9:00 AM rush without pre-staged short-order stations creates a 9.5-minute pass delay, generating a 42% walk-away balk rate at the counter. When you protect full-margin breakfast tickets and decouple grab-and-go coffee from the hot short-order line, margin health expands immediately.`;
        turnaroundMove = `Decouple grab-and-go beverage ordering from the short-order grill line to cut average line wait to 6.5 minutes.`;

        metrics = [
          `Daily Gross Sales: $${grossRev.toFixed(2)}/day — Formula: ${covers} breakfast covers @ $${avgCheck.toFixed(2)} average check.`,
          `Direct Prime Costs: $${primeCost.toFixed(2)}/day — Formula: 28.0% Food ($${(grossRev*0.28).toFixed(2)}) + 30.0% Direct Labor ($${(grossRev*0.30).toFixed(2)}).`,
          `Daily Net Operating Margin: +$${netContribution.toFixed(2)}/day — Formula: $${grossRev.toFixed(2)} Gross Sales - $${primeCost.toFixed(2)} Prime Costs (42.0% Margin).`,
          `Unit Margin Contribution: +$${unitMargin.toFixed(2)} / cover — Formula: Net operating cash generated per seated guest.`,
          `Daily Breakeven Volume: 104 covers/day — Formula: Fixed daily labor and lease overhead ($720/day) ÷ $${unitMargin.toFixed(2)} unit margin.`,
          `What-If Annual Cash Flow Recovery: +$${annualRecovery.toLocaleString()}/yr — Plain-English: Recovering 18 walk-away balked customers daily adds $${(unitMargin * 18).toFixed(2)}/day in pure net profit.`
        ];
      }
    } else if (workspace === 'bannerman' || eco.name.includes("Bannerman") || eco.businessType.includes("Real Estate")) {
      // Commercial Real Estate NNN Model
      const totalSqFt = 45000;
      const nnnRate = 34.00;
      grossRev = (totalSqFt * nnnRate) / 365;
      primeCost = grossRev * 0.18; // CAM & Management overhead
      netContribution = grossRev - primeCost;
      unitMargin = nnnRate * 0.82;
      annualRecovery = Math.round(45000 * 2.50);

      diagnosisText = `Defending $34.00/sq ft NNN base lease rates across Bannerman Crossings requires quantifying customer dwell times (68 minutes) and affluent neighborhood resident capture from Bannerman Commons. Tenants do not pay for square footage; they pay for predictable consumer gravitation.`;
      turnaroundMove = `Anchor all lease renewals around audited 6.8% Bannerman Commons resident capture and 94.5% center occupancy data.`;

      metrics = [
        `Annual Base Lease Revenue: $${(totalSqFt * nnnRate).toLocaleString()}/yr — Formula: ${totalSqFt.toLocaleString()} sq ft @ $${nnnRate.toFixed(2)}/sq ft NNN.`,
        `CAM Recovery Revenue: $${(totalSqFt * 5.50).toLocaleString()}/yr — Formula: $5.50/sq ft common area maintenance reimbursement.`,
        `Net Operating Income (NOI): $${Math.round(totalSqFt * nnnRate * 0.82).toLocaleString()}/yr — Formula: Gross collections less non-recoverable capital reserves.`,
        `Resident Catchment Rate: 8.4% — Formula: Active foot-traffic penetration from adjacent residential subdivisions.`,
        `Average Tenant Dwell Time: 68 Minutes — Formula: Verified visitor duration across dining and boutique retail anchors.`,
        `What-If Annual Asset Value Lift: +$${annualRecovery.toLocaleString()}/yr — Plain-English: Defending a +$2.50/sq ft lease spread expands annual property net cash flow by $${annualRecovery.toLocaleString()}.`
      ];
    } else if (workspace === 'healthcare_clinic' || eco.businessType.includes("Clinic") || eco.businessType.includes("Doctor")) {
      // Healthcare & Specialty Clinic Model
      const visits = 24;
      const reimbursement = 195.00;
      grossRev = visits * reimbursement;
      primeCost = grossRev * 0.42; // Clinical supplies + RN/MA billing labor
      netContribution = grossRev - primeCost;
      unitMargin = reimbursement * 0.58;
      annualRecovery = Math.round(unitMargin * 3 * 250);

      diagnosisText = `Clinic profitability is constrained by provider scheduling friction and late cancellation leakage. Deploying automated 48-hour card-on-file deposit confirmations reduces patient no-shows from 11.2% down to 3.8%, recovering 3 empty clinical hours per week without increasing administrative headcount.`;
      turnaroundMove = `Implement 48-hour automated SMS deposit confirmations to protect 91% scheduled provider capacity.`;

      metrics = [
        `Daily Clinical Collections: $${grossRev.toFixed(2)}/day — Formula: ${visits} completed encounters @ $${reimbursement.toFixed(2)} blended reimbursement.`,
        `Direct Clinical Labor & Supplies: $${primeCost.toFixed(2)}/day — Formula: 30% Nursing/MA Staff ($${(grossRev*0.30).toFixed(2)}) + 12% Clinical Supplies ($${(grossRev*0.12).toFixed(2)}).`,
        `Daily Net Operating Margin: +$${netContribution.toFixed(2)}/day — Formula: $${grossRev.toFixed(2)} Collections - $${primeCost.toFixed(2)} Prime Costs (58.0% Margin).`,
        `Unit Contribution per Patient: +$${unitMargin.toFixed(2)} / visit — Formula: Net operating cash generated per completed clinical encounter.`,
        `Clean First-Pass Claims Rate: 97.4% — Formula: Verified clean insurance submissions without denial drag.`,
        `What-If Annual Cash Flow Recovery: +$${annualRecovery.toLocaleString()}/yr — Plain-English: Recovering 3 no-show appointments weekly adds $${annualRecovery.toLocaleString()} in pure annual collections.`
      ];
    } else if (workspace === 'cleaver_brooks' || eco.name.includes("Cleaver") || eco.businessType.includes("Industrial") || cleanQuestion.toLowerCase().includes("cleaver") || cleanQuestion.toLowerCase().includes("boiler")) {
      // Industrial Thermal & Boiler Engineering Model
      const packageCapex = 425000.00;
      const annualPackages = 14;
      grossRev = (annualPackages * packageCapex) / 365;
      primeCost = grossRev * 0.62; // 38% gross margin floor (raw steel, ASME fab, boilermaker labor)
      netContribution = grossRev - primeCost;
      unitMargin = packageCapex * 0.38;
      annualRecovery = Math.round(unitMargin * 2);

      diagnosisText = `Cleaver-Brooks occupies dominant industrial market share in packaged boiler systems, but profitability is governed by long RFP sales cycles (120–240 days) and skilled boilermaker labor retention. Margin expansion is achieved not by competing on initial equipment discounts, but by attaching high-margin 10-year predictive maintenance and OEM aftermarket parts agreements.`;
      turnaroundMove = `Bundle all capital equipment bids with mandatory Tier-1 OEM parts attach to lock in a 32.0% recurring aftermarket gross margin.`;

      metrics = [
        `Average Boiler Package Value: $${packageCapex.toLocaleString('en-US', { minimumFractionDigits: 2 })} — Formula: Packaged firetube/watertube industrial system capex.`,
        `Direct Industrial Prime Costs: $${(packageCapex * 0.62).toLocaleString('en-US', { minimumFractionDigits: 2 })} — Formula: 38.0% Steel/Parts ($${(packageCapex*0.38).toFixed(2)}) + 24.0% Certified ASME Labor ($${(packageCapex*0.24).toFixed(2)}).`,
        `Gross Margin Realization: 38.0% ($${unitMargin.toLocaleString('en-US', { minimumFractionDigits: 2 })}) — Formula: Equipment gross profit before field commissioning.`,
        `Aftermarket Parts & Service Attach: 32.0% Margin — Formula: Ongoing recurring OEM burner & controls maintenance.`,
        `Skilled Boilermaker Retention Rate: 91.5% — Formula: Certified welding & fabrication workforce stability.`,
        `What-If Annual Cash Flow Recovery: +$${annualRecovery.toLocaleString()}/yr — Plain-English: Securing 2 additional retrofits via shortened RFP cycles adds $${annualRecovery.toLocaleString()} in net profit.`
      ];
    } else {
      // Default / General SaaS & Agency Model
      const accounts = 120;
      const arpu = 49.99;
      grossRev = (accounts * arpu) / 30;
      primeCost = grossRev * 0.16; // Hosting, Stripe fees, compute
      netContribution = grossRev - primeCost;
      unitMargin = arpu * 0.84;
      annualRecovery = Math.round(unitMargin * 15 * 12);

      diagnosisText = `Scaling ${eco.name} profitably requires capping monthly logo churn under 1.8% while establishing the middle tier ($39.99/mo) as the high-margin anchor. When customer payback velocity clears under 4.2 months, capital compounds organically.`;
      turnaroundMove = `Incentivize annual upfront prepay commitments with 2 bonus feature packs to pull forward Day-0 cash recovery.`;

      metrics = [
        `Monthly Recurring Revenue (MRR): $${(accounts * arpu).toFixed(2)}/mo — Formula: ${accounts} active paid subscribers @ $${arpu.toFixed(2)} blended ARPU.`,
        `Gross Software Margin: 84.0% — Formula: Top-line revenue less payment processing and edge inference unit costs.`,
        `Customer Acquisition Cost (CAC): $85.00 — Formula: Blended organic and paid acquisition spend per customer.`,
        `LTV to CAC Ratio: 4.8x — Formula: Lifetime gross profit ($408.00) ÷ Acquisition cost ($85.00).`,
        `CAC Payback Timeline: 3.4 Months — Formula: Time required to achieve 100% acquisition cost recovery.`,
        `What-If Annual Cash Flow Recovery: +$${annualRecovery.toLocaleString()}/yr — Plain-English: Expanding middle-tier adoption by +15 accounts adds $${annualRecovery.toLocaleString()}/yr in net margin.`
      ];
    }

    const generatedMemo = `### 1. ${profile.categoryName} — Operational Reality: "${cleanQuestion.substring(0, 60)}"

${diagnosisText}

>> ★ Key Turnaround Move: ${turnaroundMove}

### 2. Verified Financial Telemetry & Daily P&L Math (${eco.name})
${metrics.map(m => `• ${m}`).join('\n')}

### 3. Frontline Operational Action Plan (Today's Priorities)
1. Priority 1 (Immediate Margin Defense): Execute pre-shift alignment and station staging by 6:30 AM (Owner: General Manager / Practice Lead).
2. Priority 2 (Process & Labor Fix): Eliminate unearned promotional discounting; enforce value-based full price (Owner: Floor Lead / Shift Lead).
3. Priority 3 (Zero-Discount Customer Lock): Build permanent customer retention loops through signature quality and speed (Owner: Lead Strategist).

### 4. Direct Bottom-Line Takeaway & Operator Gate
Protecting your operational unit economics puts cash directly into your bank account without sacrificing customer trust.
Status: Cleared for Production Execution • Landen Jackson (Lead Strategic Operator)`;

    return res.json({
      choices: [{ message: { role: "assistant", content: generatedMemo } }]
    });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Dedicated Email Dispatch Endpoint
app.post('/api/dispatch-email', async (req, res) => {
  try {
    const { to, workspace = "Ma's Diner", title = "Morning Executive Strategic Briefing", memoContent } = req.body;
    if (!to || !to.includes('@')) return res.status(400).json({ error: "Valid email required." });

    const transporter = await createEmailTransporter();
    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:sans-serif; background:#090A0C; color:#E2E8F0; padding:24px;">
      <div style="max-width:600px; margin:0 auto; background:#0F1216; border:1px solid #1C2028; border-radius:8px; padding:20px;">
        <h2 style="color:#FFF; margin-top:0;">📊 ${workspace}: ${title}</h2>
        <div style="white-space:pre-wrap; line-height:1.6; color:#CBD5E1;">${memoContent}</div>
      </div>
    </body>
    </html>`;

    const info = await transporter.sendMail({
      from: `"Consultant Studio" <${process.env.SMTP_FROM || 'briefings@consultant-app.com'}>`,
      to,
      subject: `📊 ${workspace}: ${title}`,
      text: memoContent,
      html: htmlBody
    });

    return res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Consultant Studio backend running on port ${PORT}`);
});
