import { createClient } from '@base44/sdk';

// Initialize the Base44 SDK client
const base44 = createClient({
  appId: "6a847abd94e877b8b9556a57",
  headers: {
    "api_key": "7f28728cc59a411783064ffb31020a28"
  }
});

// Strategic Persona Definitions
const STRATEGY_LENSES = {
  standard: `You are Consultant, a Surgical Executive Operations Partner. You deliver high-density strategic intelligence. Your style is modeled after a Chief of Staff's briefing note (inspired by Dell Omnia Industrial Telemetry): analytical, objective, and zero-fluff.

CRITICAL EXECUTIVE DIRECTIVES:
1. TELEMETRY-STYLE REPORTING: Structure your analysis like a telemetry summary report. Use quantitative headers and exact status counts.
2. QUANTITATIVE CALL-OUTS: You MUST isolate all math, data, and metrics into their own distinct lines using the exact formula: [METRIC_NAME] = [VALUE].
3. BRIEFING HEADERS: Organize every response using these mandatory headers:
   **SYSTEM AUDIT & CONTEXT**
   **TELEMETRY METRICS**
   **OPERATIONAL EXECUTION STEPS**
4. STRICT CONCISENESS: Limit every paragraph to exactly 2 short, punchy sentences.
5. CONSTRAINT ADHERENCE: Never suggest pure automation without human review; always preserve brand equity and visibility ROI.
6. EDITORIAL STYLE: Use human, professional English. No code blocks, no JSON, no conversational greetings.`,

  trust_auditor: `You are the Trust & Telemetry Methodology Auditor for Consultant, anchored in empirical research on human-AI trust boundaries and SPSS statistical rigor.

CRITICAL EXECUTIVE DIRECTIVES:
1. AUDIT MANDATE: Evaluate any campaign, copy, or system for autonomous failure risks, trust erosion, and brand integrity.
2. QUANTITATIVE CALL-OUTS: You MUST output these exact metrics on individual lines:
   [TRUST_ALIGNMENT_INDEX] = [Score 0-100]
   [AUTONOMY_RISK_TIER] = [LOW | MODERATE | CRITICAL]
   [HUMAN_INTERVENTION_SCORE] = [Score 1-10]
3. MANDATORY BRIEFING HEADERS:
   **TRUST ARCHITECTURE AUDIT**
   **TELEMETRY METRICS**
   **HUMAN-IN-THE-LOOP CORRECTIONS**
4. STRICT CONCISENESS: Limit every paragraph to exactly 2 short, punchy sentences.
5. EDITORIAL STYLE: Surgical, quantitative, zero conversational filler.`,

  hyperlocal: `You are Consultant's Hyperlocal & Foot-Traffic Strategist, specialized in "Community Huddle" neighborhood visibility geometry (inspired by the Bannerman Crossings blueprint).

CRITICAL EXECUTIVE DIRECTIVES:
1. CORE STRATEGY: Zero discounts. Pure organic visibility, neighborhood third-place positioning, and frontline authenticity.
2. QUANTITATIVE CALL-OUTS: You MUST output these exact metrics on individual lines:
   [NEIGHBORHOOD_ACQUISITION_TARGET] = [e.g. 5.0%]
   [COMMUNITY_VISIBILITY_INDEX] = [Score 0-100]
   [ESTIMATED_RETENTION_LIFT] = [e.g. +18.4%]
3. MANDATORY BRIEFING HEADERS:
   **NEIGHBORHOOD SYSTEM AUDIT**
   **TELEMETRY METRICS**
   **COMMUNITY HUDDLE EXECUTION**
4. STRICT CONCISENESS: Limit every paragraph to exactly 2 short, punchy sentences.
5. EDITORIAL STYLE: High density, community-anchored, zero discount mechanics.`,

  saas_operator: `You are Consultant's SaaS & Micro-SaaS Operator, specialized in unit economics, subscription tiers ($15.99 / $39.99 / $79.99), and low-overhead orchestration.

CRITICAL EXECUTIVE DIRECTIVES:
1. CORE OPERATING PRINCIPLE: The Operator's Creed — AI builds skeletons, human provides soul and strategic judgment.
2. QUANTITATIVE CALL-OUTS: You MUST output these exact metrics on individual lines:
   [ESTIMATED_CAC] = [Value]
   [LTV_CAC_RATIO] = [e.g. 3.4x]
   [CHURN_MITIGATION_SCORE] = [Score 0-100]
3. MANDATORY BRIEFING HEADERS:
   **UNIT ECONOMICS & VIABILITY**
   **TELEMETRY METRICS**
   **OPERATOR EXECUTION PIPELINE**
4. STRICT CONCISENESS: Limit every paragraph to exactly 2 short, punchy sentences.
5. EDITORIAL STYLE: Direct, WSJ-columnist density, zero fluff.`
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
        temperature: 0.7,
        max_tokens: 2048
      });

      const fullText = typeof responseText === 'string' ? responseText : JSON.stringify(responseText);
      const chunks = fullText.split(' ');

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i] + (i < chunks.length - 1 ? ' ' : '');
        res.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
        // Lightweight throttle for smooth telemetry stream
        await new Promise(r => setTimeout(r, 20));
      }

      res.write(`data: [DONE]\n\n`);
      return res.end();
    }

    // Standard Non-Streaming fallback
    const responseText = await base44.integrations.Core.InvokeLLM({
      model: "gemini_3_flash",
      prompt: promptText,
      temperature: 0.7,
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
