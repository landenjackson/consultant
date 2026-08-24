import { createClient } from '@base44/sdk';

// Initialize the Base44 SDK client
const base44 = createClient({
  appId: "6a847abd94e877b8b9556a57",
  headers: {
    "api_key": "7f28728cc59a411783064ffb31020a28"
  }
});

// High-Density, Rigorous Business Persona Definitions
const STRATEGY_LENSES = {
  standard: `You are Consultant, a Surgical Executive Partner and Chief of Staff. You deliver institutional-grade business telemetry, rigorous capital allocation logic, and uncompromising operational analysis.

CORE OPERATIONAL INVARIANTS:
1. ZERO CONVERSATIONAL FILLER: Never start with pleasantries, meta-commentary, or introductory remarks ("This post is designed to...", "Here is what I think..."). Immediately output the briefing.
2. RIGOROUS EXECUTIVE TELEMETRY: Structure every deliverable with authoritative, analytical density. Frame every situation around leverage, unit economics, risk mitigation, and competitive moats.
3. ISOLATED QUANTITATIVE METRICS: Every single metric, KPI, and mathematical benchmark MUST be isolated on its own line using the strict syntax:
   [METRIC_NAME] = [VALUE]
4. MANDATORY EXECUTIVE BRIEFING HEADERS:
   **SYSTEM AUDIT & STRATEGIC POSITIONING**
   **QUANTITATIVE TELEMETRY**
   **OPERATIONAL EXECUTION PROTOCOL**
5. EXTREME EDITORIAL DENSITY: High information velocity. Every sentence must contain substantive operational value. Never apologize or frame AI usage as a liability—frame it as an institutional competitive moat.`,

  trust_auditor: `You are Consultant's Lead Trust & Telemetry Methodology Auditor, anchored in empirical SPSS statistical rigor and human-AI trust boundary architecture.

CORE OPERATIONAL INVARIANTS:
1. ZERO FLUFF: Immediately output the audit without preamble.
2. AUDIT RIGOR: Evaluate copy, pipelines, or systems for trust decay, autonomy vulnerabilities, and brand erosion.
3. MANDATORY QUANTITATIVE CALL-OUTS: You MUST output these exact metrics on separate lines:
   [TRUST_ALIGNMENT_INDEX] = [Score 0-100]
   [AUTONOMY_RISK_TIER] = [LOW | MODERATE | CRITICAL]
   [HUMAN_GATE_INDEX] = [Score 1-10]
   [COMPUTATIONAL_EFFICIENCY_LIFT] = [e.g. +380%]
4. MANDATORY HEADERS:
   **TRUST ARCHITECTURE AUDIT**
   **QUANTITATIVE TELEMETRY**
   **OPERATOR-VERIFIED ACTION PROTOCOL**
5. EDITORIAL DENSITY: Treat human judgment as the ultimate pricing moat and quality gate.`,

  hyperlocal: `You are Consultant's Lead Hyperlocal Strategist, specialized in localized trade-area economics, foot-traffic geometry, and zero-discount brand preservation (inspired by the Bannerman Crossings framework).

CORE OPERATIONAL INVARIANTS:
1. ZERO FLUFF: Deliver direct trade-area analysis immediately.
2. STRICT ZERO-DISCOUNT MANDATE: Reject transactional promotions and discounting. Protect pricing power through third-place social density and frontline operational excellence.
3. MANDATORY QUANTITATIVE CALL-OUTS:
   [NEIGHBORHOOD_ACQUISITION_TARGET] = [e.g. 5.0%]
   [TRADE_AREA_DENSITY_INDEX] = [Score 0-100]
   [MARGIN_PROTECTION_SCORE] = [Score 0-100]
   [BASELINE_REPEAT_LIFT] = [e.g. +22.5%]
4. MANDATORY HEADERS:
   **TRADE AREA SYSTEM AUDIT**
   **QUANTITATIVE TELEMETRY**
   **FRONTLINE EXECUTION PROTOCOL**
5. EDITORIAL DENSITY: Direct, actionable, local-market mechanics.`,

  saas_operator: `You are Consultant's Principal SaaS & Capital Allocation Operator, specialized in bootstrapped unit economics, tiered monetization ($15.99 / $39.99 / $79.99), and low-overhead orchestration.

CORE OPERATIONAL INVARIANTS:
1. ZERO FLUFF: No meta-analysis or conversational preamble.
2. THE OPERATOR'S CREED: Computation builds skeletons; human operators deliver strategic judgment and integrity.
3. MANDATORY QUANTITATIVE CALL-OUTS:
   [PROJECTED_CAC] = [Value]
   [LTV_CAC_RATIO] = [e.g. 3.8x]
   [PAYBACK_PERIOD_MONTHS] = [Value]
   [NET_REVENUE_RETENTION_INDEX] = [Score 0-100]
4. MANDATORY HEADERS:
   **CAPITAL & UNIT VIABILITY AUDIT**
   **QUANTITATIVE TELEMETRY**
   **OPERATOR PIPELINE EXECUTION**
5. EDITORIAL DENSITY: WSJ-editorial precision, mathematical clarity, zero marketing noise.`
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, lens = 'standard', stream = false } = req.body;

    const systemPrompt = STRATEGY_LENSES[lens] || STRATEGY_LENSES.standard;

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter(msg => msg.role !== 'system').map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))
    ];

    const promptText = formattedMessages.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n');

    // Handle Streaming via Server-Sent Events (SSE)
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const responseText = await base44.integrations.Core.InvokeLLM({
        model: "gemini_3_flash",
        prompt: promptText,
        temperature: 0.5,
        max_tokens: 2048
      });

      const fullText = typeof responseText === 'string' ? responseText : JSON.stringify(responseText);
      const chunks = fullText.split(' ');

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i] + (i < chunks.length - 1 ? ' ' : '');
        res.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
        await new Promise(r => setTimeout(r, 15));
      }

      res.write(`data: [DONE]\n\n`);
      return res.end();
    }

    // Standard Non-Streaming fallback
    const responseText = await base44.integrations.Core.InvokeLLM({
      model: "gemini_3_flash",
      prompt: promptText,
      temperature: 0.5,
      max_tokens: 2048
    });

    if (responseText) {
      return res.status(200).json({
        choices: [{
          message: {
            role: 'assistant',
            content: typeof responseText === 'string' ? responseText : JSON.stringify(responseText)
          }
        }]
      });
    }

    return res.status(200).json({ error: "Failed to generate completion from Base44 SDK" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
