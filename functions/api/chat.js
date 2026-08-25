// Cloudflare Pages Functions API Handler for /api/chat
export async function onRequestPost(context) {
  const { request } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const body = await request.json();
    const { messages, lens = 'standard', stream = false } = body;

    const STRATEGY_LENSES = {
      standard: `You are Consultant, a Surgical Executive Partner and Chief of Staff. You deliver institutional-grade business telemetry, rigorous capital allocation logic, and uncompromising operational analysis.

CORE OPERATIONAL INVARIANTS:
1. ZERO CONVERSATIONAL FILLER: Never start with pleasantries. Immediately output the briefing.
2. RIGOROUS EXECUTIVE TELEMETRY: Structure every deliverable with authoritative, analytical density.
3. ISOLATED QUANTITATIVE METRICS: Every metric MUST be on its own line: [METRIC_NAME] = [VALUE].
4. MANDATORY HEADERS:
   **SYSTEM AUDIT & STRATEGIC POSITIONING**
   **QUANTITATIVE TELEMETRY**
   **OPERATIONAL EXECUTION PROTOCOL**
5. EDITORIAL DENSITY: Exactly 2 short, punchy sentences per paragraph. Focus on ROI, brand equity, and zero discounts.`,

      trust_auditor: `You are Consultant's Lead Trust & Telemetry Methodology Auditor, anchored in empirical SPSS statistical rigor and human-AI trust boundary architecture.

CORE OPERATIONAL INVARIANTS:
1. ZERO FLUFF: Immediately output the audit without preamble.
2. MANDATORY QUANTITATIVE CALL-OUTS:
   [TRUST_ALIGNMENT_INDEX] = [Score 0-100]
   [AUTONOMY_RISK_TIER] = [LOW | MODERATE | CRITICAL]
   [HUMAN_GATE_INDEX] = [Score 1-10]
   [COMPUTATIONAL_EFFICIENCY_LIFT] = [e.g. +380%]
3. MANDATORY HEADERS:
   **TRUST ARCHITECTURE AUDIT**
   **QUANTITATIVE TELEMETRY**
   **OPERATOR-VERIFIED ACTION PROTOCOL**`,

      hyperlocal: `You are Consultant's Lead Hyperlocal Strategist, specialized in localized trade-area economics, foot-traffic geometry, and zero-discount brand preservation.

CORE OPERATIONAL INVARIANTS:
1. ZERO FLUFF: Deliver direct trade-area analysis immediately.
2. STRICT ZERO-DISCOUNT MANDATE: Reject transactional promotions.
3. MANDATORY QUANTITATIVE CALL-OUTS:
   [NEIGHBORHOOD_ACQUISITION_TARGET] = [e.g. 5.0%]
   [TRADE_AREA_DENSITY_INDEX] = [Score 0-100]
   [MARGIN_PROTECTION_SCORE] = [Score 0-100]
   [BASELINE_REPEAT_LIFT] = [e.g. +22.5%]
4. MANDATORY HEADERS:
   **TRADE AREA SYSTEM AUDIT**
   **QUANTITATIVE TELEMETRY**
   **FRONTLINE EXECUTION PROTOCOL**`,

      saas_operator: `You are Consultant's Principal SaaS & Capital Allocation Operator, specialized in bootstrapped unit economics, tiered monetization ($15.99 / $39.99 / $79.99), and low-overhead orchestration.

CORE OPERATIONAL INVARIANTS:
1. ZERO FLUFF: No meta-analysis or conversational preamble.
2. MANDATORY QUANTITATIVE CALL-OUTS:
   [PROJECTED_CAC] = [Value]
   [LTV_CAC_RATIO] = [e.g. 3.8x]
   [PAYBACK_PERIOD_MONTHS] = [Value]
   [NET_REVENUE_RETENTION_INDEX] = [Score 0-100]
3. MANDATORY HEADERS:
   **CAPITAL & UNIT VIABILITY AUDIT**
   **QUANTITATIVE TELEMETRY**
   **OPERATOR PIPELINE EXECUTION**`
    };

    const userMessage = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
    
    // Optional Tavily Search in Edge Worker
    let liveWebContext = '';
    const tavilyKey = context.env?.TAVILY_API_KEY || "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";
    
    if (userMessage.length > 5 && tavilyKey) {
      try {
        const tvlyRes = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: userMessage,
            max_results: 2,
            search_depth: 'basic'
          })
        });
        if (tvlyRes.ok) {
          const searchData = await tvlyRes.json();
          if (searchData.results?.length) {
            liveWebContext = '\n\n[LIVE TRADE & MARKET SIGNALS VIA TAVILY]:\n' + 
              searchData.results.map(r => `• ${r.title}: ${r.content.substring(0, 250)}`).join('\n\n');
          }
        }
      } catch (e) {}
    }

    const systemPrompt = (STRATEGY_LENSES[lens] || STRATEGY_LENSES.standard) + 
      (liveWebContext ? `\n\nINCORPORATE THIS VERIFIED LIVE CONTEXT INTO YOUR TELEMETRY AUDIT:${liveWebContext}` : '');

    const formattedPrompt = `[SYSTEM]: ${systemPrompt}\n` + 
      messages.filter(m => m.role !== 'system').map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n');

    // Base44 Cloud Direct Inference Gateway
    const llmRes = await fetch('https://base44.app/api/apps/6a847abd94e877b8b9556a57/integration-endpoints/Core/InvokeLLM', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': '7f28728cc59a411783064ffb31020a28',
        'X-App-Id': '6a847abd94e877b8b9556a57'
      },
      body: JSON.stringify({
        model: "gemini_3_flash",
        prompt: formattedPrompt,
        temperature: 0.5,
        max_tokens: 2048
      })
    });

    if (!llmRes.ok) {
      const errText = await llmRes.text();
      return new Response(JSON.stringify({ error: `Base44 LLM invocation failed: ${errText}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const rawResponse = await llmRes.json();
    const responseText = typeof rawResponse === 'string' ? rawResponse : JSON.stringify(rawResponse);

    if (stream) {
      const encoder = new TextEncoder();
      const chunks = responseText.split(' ');
      
      const readableStream = new ReadableStream({
        async start(controller) {
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i] + (i < chunks.length - 1 ? ' ' : '');
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: chunk })}\n\n`));
            await new Promise(r => setTimeout(r, 15));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      return new Response(readableStream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    return new Response(JSON.stringify({
      choices: [{
        message: {
          role: 'assistant',
          content: responseText
        }
      }]
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
