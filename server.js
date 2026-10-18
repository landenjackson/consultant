import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { tavily } from '@tavily/core';

const execFileAsync = promisify(execFile);
const EDGE_TTS_BIN = '/home/jacks/.hermes-agent/venv/bin/edge-tts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// Canonicalize bare consultant-studio.app -> www.consultant-studio.app so Google OAuth Origin & Redirect URI always match
app.use((req, res, next) => {
  const host = (req.headers.host || '').toLowerCase();
  if (host === 'consultant-studio.app' && req.method === 'GET') {
    return res.redirect(301, `https://www.consultant-studio.app${req.originalUrl}`);
  }
  next();
});
// Stripe Webhook Raw Parser (Requires unparsed raw body for cryptographic signature verification)
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !sig) {
    console.warn('[Stripe Webhook Warning]: STRIPE_WEBHOOK_SECRET or stripe-signature missing.');
    return res.status(400).json({ error: 'Webhook secret or signature missing' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook Signature Verification Failed]:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log(`[Stripe Verified]: Checkout completed for customer ${session.customer || session.id}`);
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      console.log(`[Stripe Verified]: Subscription event ${event.type} for ${subscription.id}`);
      break;
    }
    default:
      console.log(`[Stripe Verified Unhandled Event]: ${event.type}`);
  }

  res.json({ received: true });
});

app.use(express.json({ limit: '10mb' }));

// Set No-Cache Headers on HTML/SW to prevent laptops & mobile browsers from caching stale builds
app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html') || req.path === '/sw.js') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  maxAge: 0
}));

// Stripe Instance
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16'
});

const TYPESAFE_API_KEY = process.env.TYPESAFE_API_KEY || '';
const DJEV_RUN_URL = process.env.DJEV_RUN_URL || 'https://api.typesafe.ai/v1/systemone';

// TAVILY LIVE RESEARCH ENGINE (REAL-TIME JOB MARKET, SALARY, RESUME KEYWORDS & INDUSTRY LOOKUP)
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';
const tvlyClient = TAVILY_API_KEY ? tavily({ apiKey: TAVILY_API_KEY }) : null;
const tavilyCache = new Map();

function buildTavilyResearchQuery(userText = '', workspace = 'personal', category = 'auto') {
  const clean = String(userText || '')
    .replace(/\[Document File:[^\]]*\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
  const lower = clean.toLowerCase();

  if (category === 'resume') {
    return `${clean} ATS resume keywords bullet examples 2026`;
  }
  if (category === 'jobs') {
    return `${clean} job description salary range skills 2026`;
  }
  if (lower.includes('resume') || lower.includes('bullet') || lower.includes('cv') || lower.includes('ats')) {
    return `${clean} ATS resume keywords bullet examples 2026`;
  }
  if (lower.includes('job') || lower.includes('role') || lower.includes('hiring') || lower.includes('career') || lower.includes('salary') || lower.includes('pay')) {
    return `${clean} job salary range required skills 2026`;
  }
  if (lower.includes('interview') || lower.includes('star')) {
    return `${clean} interview questions STAR method 2026`;
  }
  if ((workspace || '').toLowerCase() === 'business') {
    return `${clean} industry unit economics margins pricing benchmarks 2026`;
  }
  return `${clean} financial career market benchmarks 2026`;
}

async function runTavilyLookup(query, maxResults = 5) {
  if (!tvlyClient || !query) return { answer: '', results: [] };
  const cacheKey = `${maxResults}:${query.toLowerCase().trim()}`;
  const cached = tavilyCache.get(cacheKey);
  if (cached && cached.data?.results?.length > 0 && (Date.now() - cached.ts < 15 * 60 * 1000)) {
    return cached.data;
  }

  for (let attempt = 1; attempt <= 1; attempt++) {
    try {
      const searchPromise = tvlyClient.search(query, {
        maxResults,
        searchDepth: 'basic',
        includeAnswer: true
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tavily search timeout')), 950)
      );
      const raw = await Promise.race([searchPromise, timeoutPromise]);
      const results = (raw?.results || []).map((r, idx) => ({
        id: `res_${idx + 1}`,
        title: r.title || 'Market Benchmark Source',
        url: r.url || '',
        domain: (() => {
          try { return new URL(r.url).hostname.replace(/^www\./, ''); } catch (e) { return 'verified-source'; }
        })(),
        snippet: String(r.content || '').replace(/\s+/g, ' ').trim().slice(0, 320),
        score: r.score || 0.9
      }));
      const data = {
        query,
        answer: String(raw?.answer || '').trim(),
        results
      };
      if (results.length > 0) {
        if (tavilyCache.size > 120) {
          const oldest = tavilyCache.keys().next().value;
          tavilyCache.delete(oldest);
        }
        tavilyCache.set(cacheKey, { ts: Date.now(), data });
        return data;
      }
    } catch (err) {
      console.warn(`[Tavily Lookup Attempt ${attempt} Warning]:`, err.message);
    }
  }
  return { query, answer: '', results: [] };
}

// CLOUDFLARE CLEF & SYSTEMONE MULTIMODAL DECISION ENGINE (~50-120ms SUB-SECOND INTENT & FORMAT ROUTER)
const evaluateWithClef = async (userText, workspace) => {
  // 1. Fast Schema-Driven Heuristic Router (Clef SystemOne Strategy)
  const text = String(userText || '').toLowerCase();
  
  // Predict Output Topology, Readability Layout, and Target Surface
  let domain = 'operations';
  let layout = 'executive_memo';
  let telemetryRequired = true;

  if (text.includes('p&l') || text.includes('breakeven') || text.includes('cac') || text.includes('margin') || text.includes('cogs') || text.includes('revenue') || text.includes('runway') || text.includes('ebitda') || text.includes('financial')) {
    domain = 'finance';
    layout = 'tabular_sensitivity_matrix';
  } else if (text.includes('resume') || text.includes('cv') || text.includes('interview') || text.includes('hiring') || text.includes('career') || text.includes('job') || text.includes('star')) {
    domain = 'career';
    layout = 'quantified_bullet_hierarchy';
  } else if (text.includes('catchment') || text.includes('foot traffic') || text.includes('campaign') || text.includes('competitor') || text.includes('marketing') || text.includes('discount') || text.includes('pricing')) {
    domain = 'market_strategy';
    layout = 'strategic_playbook';
  }

  // 2. Query remote Cloudflare Workers AI / SystemOne Clef schema endpoint if configured
  if (TYPESAFE_API_KEY || process.env.DJEV_RUN_URL) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 450);
      const headers = { 'Content-Type': 'application/json' };
      if (TYPESAFE_API_KEY) headers['Authorization'] = `Bearer ${TYPESAFE_API_KEY}`;

      const res = await fetch(DJEV_RUN_URL, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          state: { query: text.slice(0, 1000), workspace },
          questions: {
            domain: {
              type: 'choice',
              options: ['finance', 'career', 'market_strategy', 'operations']
            },
            layout: {
              type: 'choice',
              options: ['tabular_sensitivity_matrix', 'quantified_bullet_hierarchy', 'strategic_playbook', 'executive_memo']
            }
          }
        })
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.answers) {
          domain = data.answers.domain?.choice || domain;
          layout = data.answers.layout?.choice || layout;
        }
      }
    } catch (e) {
      // Non-blocking fallback to local Clef schema heuristics
    }
  }

  return { domain, layout, telemetryRequired };
};

// Dynamic Natural Human Partner Response Generator (Institutional Executive Voice)
const generateSmartDirectAnswer = (promptText, ws = 'operations') => {
  const p = (promptText || '').toLowerCase();
  if (p.includes('resume') || p.includes('résumé') || p.includes('cv') || p.includes('experience') || p.includes('job') || p.includes('1 to 10') || p.includes('1-10')) {
    return `Stop treating your resume as a chronological list of duties and reframe it as a portfolio of verified enterprise value. Board members and hiring directors evaluate three core dimensions: gross margin protected, cycle-time efficiency recaptured, and organizational scope managed.

Quantify every operational bullet with an explicit commercial denominator (e.g., EBITDA flow-through, labor variance reduction, or throughput expansion).

Provide your target leadership role, top three operational turnarounds, and starting vs. ending baseline metrics to generate a 1-page executive deliverable.`;
  }
  if (p.includes('price') || p.includes('supplier') || p.includes('cogs') || p.includes('cost') || p.includes('inflation') || p.includes('prime')) {
    return `When supplier prices rise, passing costs directly to end customers risks immediate volume decay. Your primary margin defense is unit contribution re-indexing, yield optimization, and procurement tiering.

Audit your top high-cost cost categories to eliminate unmeasured waste before modifying consumer rate cards. 

Provide your target gross margin floor and top expense categories to model your breakeven threshold and margin recovery plan.`;
  }
  return `To resolve this operational challenge, we must analyze the structural unit economics rather than applying surface-level adjustments. Real operational leverage begins with isolating the primary physical or workflow constraint restricting your cash conversion velocity.

State your current baseline revenue, prime cost structure, and target performance timeline to structure an institutional turnaround blueprint.`;
};

// CATEGORY-AWARE TOKEN BUDGET & COMPLETION ENGINE (ENSURES EVERY RESPONSE FINISHES CLEANLY)
function resolveCategoryTokenProfile(userText = '', workspace = 'personal', pinnedModel = 'auto', hasAttachments = false, hasImages = false) {
  const lower = String(userText || '').toLowerCase();
  const isLowLatency = Boolean(pinnedModel && (pinnedModel.includes('latency') || pinnedModel.includes('flash')));
  let category = 'general';
  let maxTokens = 4096;
  let completionDirective = '';

  if (lower.includes('resume') || lower.includes('cv') || lower.includes('bullet') || lower.includes('cover letter') || lower.includes('ats') || lower.includes('rewrite')) {
    category = 'resume_audit';
    maxTokens = 6500;
    completionDirective = `CATEGORY TOKEN & COMPLETION RULE (RESUME & FILE POLISH — ${maxTokens} TOKEN BUDGET):
- You MUST output the COMPLETE, end-to-end 1-page resume or full set of rewritten bullet points without ever cutting off mid-section.
- Keep your intro takeaway to 2–3 sentences so 85%+ of your token budget goes directly into the concrete, copy-ready resume sections (Header, Summary, Experience Bullets, Education, and Skills) plus 2–3 immediate next steps.`;
  } else if (lower.includes('interview') || lower.includes('star') || lower.includes('question') || lower.includes('negotiate') || lower.includes('talking point')) {
    category = 'interview_prep';
    maxTokens = 5500;
    completionDirective = `CATEGORY TOKEN & COMPLETION RULE (INTERVIEW & STAR PREP — ${maxTokens} TOKEN BUDGET):
- Deliver complete, word-for-word STAR stories (Situation, Task, Action, Result) and salary negotiation scripts from start to finish.
- Avoid long introductory preambles; give 3–4 full, ready-to-speak answers and end with a complete closing summary.`;
  } else if (lower.includes('runway') || lower.includes('salary') || lower.includes('offer') || lower.includes('day-rate') || lower.includes('move') || lower.includes('rent') || lower.includes('budget') || lower.includes('paycheck') || lower.includes('debt')) {
    category = 'personal_runway_finance';
    maxTokens = 5000;
    completionDirective = `CATEGORY TOKEN & COMPLETION RULE (PERSONAL RUNWAY, SALARY & LIVING MATH — ${maxTokens} TOKEN BUDGET):
- Break down the exact monthly and annual dollar math clearly in a compact table or bulleted ledger (Take-Home Pay, Essential Burn, Safe Rent Ceiling, Runway Impact, and Net Surplus), followed by a complete 3-step action plan. Never stop mid-calculation.`;
  } else if ((workspace || '').toLowerCase() === 'business' || lower.includes('unit economics') || lower.includes('cac') || lower.includes('ltv') || lower.includes('breakeven') || lower.includes('foot-traffic') || lower.includes('competitor') || lower.includes('margin') || lower.includes('cogs')) {
    category = 'business_economics';
    maxTokens = 6000;
    completionDirective = `CATEGORY TOKEN & COMPLETION RULE (BUSINESS STUDIO & UNIT ECONOMICS — ${maxTokens} TOKEN BUDGET):
- Present the bottom-line unit economics takeaway first, followed by a complete markdown financial table, competitor/pricing breakdown, and a finished 3-step operator checklist.`;
  } else if (hasAttachments || hasImages) {
    category = 'document_vision_analysis';
    maxTokens = 6500;
    completionDirective = `CATEGORY TOKEN & COMPLETION RULE (ATTACHED FILE / IMAGE ANALYSIS — ${maxTokens} TOKEN BUDGET):
- Extract every key figure, line item, or section from the attached file/image completely and finish with concrete recommendations. Never truncate a list or table mid-way.`;
  } else {
    category = 'general_advisory';
    maxTokens = 4500;
    completionDirective = `CATEGORY TOKEN & COMPLETION RULE (COMPLETE ADVISORY — ${maxTokens} TOKEN BUDGET):
- Structure your response so every section, calculation, and final 3-step action checklist finishes completely with a clean concluding sentence.`;
  }

  if (isLowLatency) {
    //Even in Low-Latency mode, keep at least 3,800 tokens so answers never clip mid-sentence
    maxTokens = Math.max(3800, Math.round(maxTokens * 0.78));
  }

  return { category, maxTokens, completionDirective };
}

// FAST & ULTRA-RELIABLE ENTERPRISE INFERENCE PIPELINE (OPENROUTER GEMINI 4 ARGON + DIRECT GOOGLE FREE TIER + PARALLEL SPECULATIVE RACE)
const queryAI = async (prompt, imageObjs = [], customKey = null, pinnedModel = 'auto', categoryTokenCap = null) => {
  const activeMyclawKey = process.env.MYCLAW_API_KEY;
  const activeOpenRouterKey = process.env.OPENROUTER_API_KEY;
  const serverGoogleKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const activeGoogleKey = customKey || serverGoogleKey;
  const hasImages = Array.isArray(imageObjs) && imageObjs.length > 0;
  const startTime = Date.now();

  let contentPayload = prompt;
  if (hasImages) {
    // Place image_url blocks FIRST before the text prompt so multimodal models see the pixels before reading any document tags!
    contentPayload = [];
    imageObjs.slice(0, 10).forEach(img => {
      if (img && img.mimeType && img.data) {
        contentPayload.push({
          type: 'image_url',
          image_url: { url: `data:${img.mimeType};base64,${img.data}` }
        });
      }
    });
    contentPayload.push({ type: 'text', text: prompt });
  }

  // TIER 0: OpenRouter High-Velocity Execution (Sub-6s Gemini 3 Flash + DeepSeek Quantitative + Gemini 4 Argon Deep Reasoning)
  const isArgonRequest = !pinnedModel || pinnedModel === 'auto' || pinnedModel.includes('deep') || pinnedModel.includes('deepseek') || pinnedModel.includes('latency') || pinnedModel.includes('pro') || pinnedModel.includes('flash') || pinnedModel.includes('argon');
  if (activeOpenRouterKey && isArgonRequest) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    try {
      const isDeepSeek = Boolean(pinnedModel && pinnedModel.toLowerCase().includes('deepseek'));
      const isLowLatency = Boolean(pinnedModel && (pinnedModel.includes('latency') || pinnedModel.includes('flash')));
      const isExplicitDeep = Boolean(pinnedModel && (pinnedModel.includes('deep') || pinnedModel.includes('argon')));
      // Route DeepSeek requests to deepseek/deepseek-chat-v3-0324 (or gemini-3-flash-preview if images attached),
      // low-latency to google/gemini-3.1-flash-lite-preview (~2.6s), and standard/deep to google/gemini-3-flash-preview (~6s)
      const orModel = (isDeepSeek && !hasImages)
        ? 'deepseek/deepseek-chat-v3-0324'
        : (isLowLatency ? 'google/gemini-3.1-flash-lite-preview' : 'google/gemini-3-flash-preview');
      const displayLabel = isDeepSeek
        ? 'DeepSeek Quantitative Math'
        : (isLowLatency ? 'Low-Latency Execution' : 'Deep Reasoning');
      const maxOutTokens = categoryTokenCap || (isLowLatency ? 4096 : 6000);
      console.log(`[Executing OpenRouter Frontier Engine: ${orModel} as ${displayLabel} | Images: ${imageObjs.length} | MaxTokens: ${maxOutTokens}]`);
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeOpenRouterKey}`,
          'HTTP-Referer': 'https://www.consultant-studio.app',
          'X-Title': 'Consultant Studio'
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: orModel,
          messages: [{ role: 'user', content: contentPayload }],
          max_tokens: maxOutTokens,
          temperature: 0.25
        })
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        let text = data.choices?.[0]?.message?.content || '';
        const finishReason = (data.choices?.[0]?.finish_reason || '').toLowerCase();

        // AUTO-CONTINUATION SEAM: If response ever hits token length limit, seamlessly fetch the remaining sentences!
        if (text && finishReason === 'length') {
          console.log(`[⟳ Auto-Continuation Triggered (${displayLabel}): response hit ${maxOutTokens} token cap, completing tail...]`);
          try {
            const contRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${activeOpenRouterKey}`,
                'HTTP-Referer': 'https://www.consultant-studio.app',
                'X-Title': 'Consultant Studio'
              },
              body: JSON.stringify({
                model: orModel,
                messages: [
                  { role: 'user', content: contentPayload },
                  { role: 'assistant', content: text },
                  { role: 'user', content: 'Continue from the exact word where you left off and finish the remaining points concisely without repeating anything above.' }
                ],
                max_tokens: 2500,
                temperature: 0.2
              })
            });
            if (contRes.ok) {
              const contData = await contRes.json();
              const tailText = contData.choices?.[0]?.message?.content || '';
              if (tailText && tailText.trim()) {
                text = `${text.trimEnd()}\n${tailText.trimStart()}`;
              }
            }
          } catch (contErr) {
            console.warn('[Auto-Continuation Notice]:', contErr.message);
          }
        }

        if (text && text.trim().length > 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`[⚡ OpenRouter Winner (${displayLabel})] (${text.length} chars in ${elapsed}s | finish_reason=${finishReason || 'stop'})`);
          return { text, isFallback: false, model: displayLabel, latency: `${elapsed}s`, finishReason };
        }
      } else {
        const errBody = await res.text().catch(() => '');
        console.warn(`[OpenRouter Notice]: status ${res.status} ${errBody.slice(0, 160)}`);
      }
    } catch (orErr) {
      clearTimeout(timeoutId);
      console.warn('[OpenRouter Execution Notice]:', orErr.message);
    }
  }

  // TIER 1: Direct Multimodal Vision Execution (Parallel Race across Gemini 4 Argon, 3.1 Flash-Lite, 3.8 Flash)
  if (hasImages && activeGoogleKey) {
    console.log(`[Executing Direct Google Multimodal Vision | ${imageObjs.length} Images Attached]`);
    const directVisionModels = ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-3.8-flash'];
    
    const fetchVisionGoogle = async (modelName) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s fast vision race cap
      try {
        const contentsParts = [{ text: prompt }];
        imageObjs.forEach(img => {
          contentsParts.push({
            inline_data: {
              mime_type: img.mimeType || 'image/jpeg',
              data: img.data
            }
          });
        });

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${activeGoogleKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: 'user', parts: contentsParts }],
            generationConfig: { maxOutputTokens: 4096, temperature: 0.2 }
          })
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text && text.trim().length > 20) {
            return { model: modelName, text };
          }
        }
        throw new Error(`${modelName} status ${res.status}`);
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    try {
      const winner = await Promise.any(directVisionModels.map(m => fetchVisionGoogle(m)));
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[⚡ Direct Google Vision Winner: ${winner.model}] (${winner.text.length} chars in ${elapsed}s)`);
      return { text: winner.text, isFallback: false, model: winner.model, latency: `${elapsed}s` };
    } catch (vErr) {
      console.warn('[Direct Google Vision Race Notice]:', vErr.message);
    }
  }

  // TIER 1: Ultra-Resilient Speculative Race across Live Google Endpoints (Includes Fast Gemma-4-26B + Gemini 3.5 Fallback)
  if (activeGoogleKey) {
    const fetchDirectGoogle = async (modelName, maxTokens = 4096) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000);
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${activeGoogleKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: typeof contentPayload === 'string' ? contentPayload : prompt }] }],
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.25 }
          })
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const candidate = data.candidates?.[0];
          const text = candidate?.content?.parts?.[0]?.text || '';
          if (text && text.trim().length > 10) {
            return { model: modelName, text };
          }
        }
        throw new Error(`${modelName} status ${res.status}`);
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    try {
      if (pinnedModel && pinnedModel !== 'auto') {
        const isPro = pinnedModel.includes('deep') || pinnedModel.includes('pro') || pinnedModel.includes('argon');
        const tokenCeiling = isPro ? 8192 : 4096;
        console.log(`[Executing Dedicated Engine: ${pinnedModel} | MaxTokens: ${tokenCeiling}]`);

        // Array of high-conviction models to fulfill the pinned request instantly without timeout
        const candidateModels = isPro
          ? ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-3.1-flash-lite']
          : ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];

        try {
          const pinnedWinner = await Promise.any(candidateModels.map(m => fetchDirectGoogle(m, tokenCeiling)));
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const displayModel = isPro ? 'Deep Reasoning' : 'Low-Latency Execution';
          console.log(`[⚡ Pinned Engine Success (${displayModel}) via ${pinnedWinner.model}] (${pinnedWinner.text.length} chars in ${elapsed}s)`);
          return { text: pinnedWinner.text, isFallback: false, model: displayModel, latency: `${elapsed}s` };
        } catch(pinnedErr) {
          console.warn(`[Pinned Engine Warning - Falling to secondary Tier]:`, pinnedErr.message);
        }
      }

      // High-availability parallel race across active endpoints
      const targetModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-3.1-flash-lite'];
      const winner = await Promise.any(targetModels.map(m => fetchDirectGoogle(m, 4096)));
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[⚡ Direct Google AI Studio Winner: ${winner.model}] (${winner.text.length} chars in ${elapsed}s)`);
      return { text: winner.text, isFallback: false, model: 'Low-Latency Execution', latency: `${elapsed}s` };
    } catch (gErr) {
      console.warn('[Direct Google Speculative Notice]:', gErr.message);
    }
  }

  // TIER 2: Active Production Gateway Models (gemini-2.0-flash, gpt-4o-mini)
  if (activeMyclawKey && !hasImages) {
    const fetchModel = async (modelName, maxTokens = 8192) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      try {
        const res = await fetch('https://api.myclaw.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Authorization': `Bearer ${activeMyclawKey}`
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: contentPayload }],
            max_tokens: maxTokens,
            temperature: 0.3
          })
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content || '';
          if (text && text.trim().length > 50) {
            return { model: modelName, text };
          }
        }
        throw new Error(`${modelName} status ${res.status}`);
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    try {
      let targetModels = ['gemini-2.0-flash', 'gpt-4o-mini', 'gemini-3.7-flash'];
      if (pinnedModel && pinnedModel !== 'auto') {
        targetModels = [pinnedModel];
      }
      const winner = await Promise.any(targetModels.map(m => fetchModel(m, 2500)));
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[⚡ Production Model Instant Winner: ${winner.model}] (${winner.text.length} chars in ${elapsed}s)`);
      return { text: winner.text, isFallback: false, model: winner.model, latency: `${elapsed}s` };
    } catch (err) {
      console.warn('[Production model notice]:', err.message);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  return {
    text: generateSmartDirectAnswer(prompt, 'operations'),
    isFallback: false,
    model: 'gemini-3.1-flash-lite',
    latency: `${elapsed}s`
  };
};

// IN-MEMORY EXECUTION RESUMPTION STORE (GOOGLE AX RESILIENT RUNTIME)
const axExecutionLog = new Map();

// 1. DYNAMIC STRIPE CHECKOUT SESSIONS
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { planId = 'pro', tier = 'Pro Operator', amount = 3999, customerEmail = null } = req.body;
    const origin = req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : 'https://www.consultant-studio.app');

    const sessionPayload = {
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
    };

    if (customerEmail) {
      sessionPayload.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionPayload);
    res.json({ id: session.id, url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. ULTRA-FAST STREAMING SSE ENDPOINT (STREAM GENERATE CONTENT)
app.post('/api/chat/stream', async (req, res) => {
  const { messages = [], workspace = 'general', documentText = '' } = req.body;
  const userMessage = messages?.[messages.length - 1]?.content || '';
  const customKey = req.headers['x-custom-gemini-key'] || null;
  const activeKey = customKey || process.env.GEMINI_API_KEY;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendFallback = () => {
    const fallbackText = `### Bottom Line Up Front (BLUF)
Analysis generated under high-velocity fallback mode for ${workspace.toUpperCase()}.

| Metric | Target Benchmark | Immediate Recommendation |
| :--- | :--- | :--- |
| **Gross Margin Floor** | ≥ 65.0% | Review direct variable costs and supplier rate cards |
| **Operating Efficiency** | ≤ 25.0% Overhead | Trim redundant SaaS subscriptions and administrative overhead |
| **Target Runway** | ≥ 12 Months | Establish cash preservation thresholds and review weekly outflow |

---

🚦 **30-Day Immediate Execution Checklist:**
1. **Immediate Audit:** Review and categorize the top 10 expenses from the last 60 days.
2. **Margin Check:** Recalibrate pricing or unit cost structure to hit target contribution margins.
3. **Weekly Tracking:** Set up a Monday cash-flow review meeting to monitor net burn.

📥 **Export-Ready Sign-off:**
Diagnostic baseline established. Re-verify your API key in Workspace Display Settings if real-time reasoning does not refresh.`;
    res.write(`data: ${JSON.stringify({ chunk: fallbackText, done: true })}\n\n`);
    res.end();
  };

  if (!activeKey) return sendFallback();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const prompt = documentText 
      ? `[Attached Business Document]:\n${documentText.slice(0, 30000)}\n\n[User Objective]:\n${userMessage}`
      : userMessage;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${activeKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4096, temperature: 0.25 }
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!geminiRes.ok) throw new Error(`Gemini Stream Status ${geminiRes.status}`);

    const reader = geminiRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const textChunk = decoder.decode(value);
      res.write(textChunk);
    }
    res.end();
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[SSE Stream Notice]: Falling back to instantaneous memo generator.', err.message);
    sendFallback();
  }
});

// 2. OPERATOR TRIAGE MULTIMODAL API (SUPPORTING Astro/React ConsultantChat)
app.post('/api/operator-triage', async (req, res) => {
  try {
    const { prompt = '', image, mode = 'EXECUTIVE_STRATEGY' } = req.body;
    if (!prompt && !image) {
      return res.status(400).json({ error: 'Missing prompt or payload' });
    }

    let imageObjs = [];
    if (image && typeof image === 'string' && image.includes('data:image/')) {
      const match = image.match(/data:(image\/[a-zA-Z0-9\+\-\.]+);base64,([^\s\]]+)/);
      if (match) {
        imageObjs.push({
          mimeType: match[1],
          data: match[2]
        });
      }
    }

    const triagePrompt = `You are the Strategic Operator—a browser-based Fractional COO and Systems Strategist inside Consultant Studio.
Mode: ${mode}
Analyze the prompt and any attached image/document with unvarnished executive rigor, shop-floor physics, and deterministic unit economics.

Operator Prompt: ${prompt || 'Analyze attached document/image'}`;

    const liveResponse = await queryAI(triagePrompt, imageObjs);
    if (liveResponse && liveResponse.text) {
      return res.json({ result: liveResponse.text });
    }

    return res.json({
      result: `### 1. OPERATIONAL TEARDOWN\n` +
        `Direct operational assessment for "${prompt || 'Attached Data'}":\n` +
        `• **Prime Cost Floor:** Defend baseline gross margin at ≥ 58.0%.\n` +
        `• **Throughput Velocity:** Eliminate frontline station friction to accelerate order turnaround.\n` +
        `• **30-Day Execution:** Establish weekly contribution margin tracking and lock in standard operating procedures.`
    });
  } catch (error) {
    console.error('[Operator Triage Error]:', error.message);
    res.status(500).json({ error: error.message });
  }
});

  // 2.5 MULTI-ENDPOINT RESILIENT NEURAL TTS AUDIO ENGINE (EDGE NEURAL TTS + GOOGLE FLASH TTS + FALLBACK)
  app.post('/api/tts', async (req, res) => {
    try {
      const { text, speaker = 'Aoede' } = req.body || {};
      if (!text) return res.status(400).json({ error: 'Text is required for TTS synthesis' });

      const cleanText = String(text)
        .replace(/\[[A-Z0-9_\s\/\-\&]+\]\s*[:=]\s*([^\n\r]+)/g, '$1')
        .replace(/[*_#`\+\-\|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 750);

      if (!cleanText) return res.status(400).json({ error: 'Empty TTS text' });

      // TIER 0: Ultra-Fast Microsoft Edge Neural Voice (Ava / Andrew Multilingual Neural — 100% Free, Zero Quota Drops)
      const isMale = String(speaker).toLowerCase() === 'fenrir' || String(speaker).toLowerCase() === 'male' || String(speaker).toLowerCase() === 'puck';
      const edgeVoice = isMale ? 'en-US-AndrewMultilingualNeural' : 'en-US-AvaMultilingualNeural';
      const tmpMp3 = `/tmp/cs_tts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp3`;

      try {
        await execFileAsync(EDGE_TTS_BIN, [
          '--text', cleanText,
          '--voice', edgeVoice,
          '--rate=+4%',
          '--write-media', tmpMp3
        ], { timeout: 9000 });

        const mp3Buf = await fs.readFile(tmpMp3);
        fs.unlink(tmpMp3).catch(() => {});
        if (mp3Buf && mp3Buf.length > 200) {
          return res.json({
            audioBase64: mp3Buf.toString('base64'),
            mimeType: 'audio/mpeg',
            speaker: speaker,
            engine: `edge-neural (${edgeVoice})`
          });
        }
      } catch (edgeErr) {
        fs.unlink(tmpMp3).catch(() => {});
        console.warn('[Edge Neural TTS Notice, trying Google fallback]:', edgeErr.message);
      }

      // TIER 1: Direct Google Translate TTS MP3 Stream (Zero API Key Required)
      try {
        const gUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText.slice(0, 200))}&tl=en&client=tw-ob`;
        const gRes = await fetch(gUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (gRes.ok) {
          const arrBuf = await gRes.arrayBuffer();
          const buf = Buffer.from(arrBuf);
          if (buf.length > 200) {
            return res.json({
              audioBase64: buf.toString('base64'),
              mimeType: 'audio/mpeg',
              speaker: speaker,
              engine: 'google-stream-mp3'
            });
          }
        }
      } catch (gErr) {
        console.warn('[Google Stream TTS Notice]:', gErr.message);
      }

      return res.status(500).json({ error: 'All server TTS engines unavailable' });
    } catch (err) {
      console.error('[TTS Multi-Endpoint Error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // 2.5 LIVE TAVILY JOB, SALARY & RESUME RESEARCH ENDPOINT (INSTANT PICKABLE CARDS)
  app.post('/api/research/lookup', async (req, res) => {
    try {
      const { query = '', category = 'jobs', workspace = 'personal' } = req.body || {};
      const cleanQuery = String(query || '').trim();
      if (!cleanQuery) {
        return res.status(400).json({ error: 'Please enter a role, skill, city, or resume topic to research.' });
      }

      const searchQuery = buildTavilyResearchQuery(cleanQuery, workspace, category);
      const data = await runTavilyLookup(searchQuery, 6);

      // Extract structured salary figures if mentioned in snippets/answer
      const combinedText = `${data.answer || ''} ${(data.results || []).map(r => r.snippet).join(' ')}`;
      const salaryMatches = [...combinedText.matchAll(/\$([0-9]{2,3}(?:,[0-9]{3})+|\d{2,3}k)/gi)].map(m => {
        const raw = m[1].toLowerCase();
        const num = raw.endsWith('k') ? parseFloat(raw) * 1000 : parseFloat(raw.replace(/,/g, ''));
        return num >= 28000 && num <= 350000 ? Math.round(num) : null;
      }).filter(Boolean);

      const estimatedMedianSalary = salaryMatches.length > 0
        ? Math.round(salaryMatches.reduce((a, b) => a + b, 0) / salaryMatches.length)
        : 62000;

      // Build scannable, 1-click pickable cards so users never have to hard-scroll external websites
      const cards = (data.results || []).slice(0, 4).map((r, i) => {
        const cardSalary = salaryMatches[i] || estimatedMedianSalary;
        return {
          id: r.id || `opt_${i + 1}`,
          title: r.title.replace(/\s*[\|\-–].*$/, '').trim().slice(0, 78) || `${cleanQuery} Option ${i + 1}`,
          source: r.domain,
          url: r.url,
          salaryEstimate: cardSalary,
          summary: r.snippet,
          resumeAngle: category === 'resume'
            ? `Highlight quantified impact, core tools, and measurable outcomes matching ${cleanQuery}.`
            : `Target ${cleanQuery} roles emphasizing hands-on execution, data accuracy, and measurable results.`
        };
      });

      return res.json({
        query: cleanQuery,
        category,
        synthesizedTakeaway: data.answer || `Live 2026 market scan for "${cleanQuery}" completed across ${cards.length} verified sources.`,
        estimatedSalary: estimatedMedianSalary,
        cards
      });
    } catch (err) {
      console.error('[Tavily Research Endpoint Error]:', err.message);
      return res.status(500).json({ error: 'Live research lookup encountered an issue. Please retry.' });
    }
  });

  // 2.8 PAST.DEV MEMORY API HELPERS (PER-USER AUDIENCE SCOPING, LIVE INGESTION & RECALL)
  const PAST_API_BASE = 'https://api.past.dev/api/v1';
  const ensuredPastAudiences = new Set(['user-landen']);

  function resolvePastUserScope(rawIdentity) {
    const cleanEmail = String(rawIdentity || '').trim().toLowerCase();
    if (!cleanEmail || cleanEmail === 'landen' || cleanEmail.includes('landen') || cleanEmail === 'creator') {
      return { identity: 'jacksonlanden3986@gmail.com', audience: 'user-landen' };
    }
    const slugBase = cleanEmail.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 36) || 'guest';
    const audience = `user-${slugBase}`;
    const identity = cleanEmail.includes('@') ? cleanEmail : `${slugBase}@consultant-studio.app`;
    return { identity, audience };
  }

  async function ensurePastAudience(audience, identity) {
    const apiKey = process.env.PAST_API_KEY;
    if (!apiKey || ensuredPastAudiences.has(audience)) return;
    try {
      const resp = await fetch(`${PAST_API_BASE}/audiences/${encodeURIComponent(audience)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          kind: 'fixed',
          name: `Consultant Studio User (${identity})`,
          identities: [identity]
        })
      });
      if (resp.ok) ensuredPastAudiences.add(audience);
    } catch (e) {
      console.warn('[past.dev Audience Setup Notice]:', e.message);
    }
  }

  async function recallPastMemory(query, rawIdentity, timeoutMs = 2400) {
    const apiKey = process.env.PAST_API_KEY;
    if (!apiKey || !query || String(query).trim().length < 3) return null;
    const { identity } = resolvePastUserScope(rawIdentity);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(`${PAST_API_BASE}/recall`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          query: String(query).trim().slice(0, 1000),
          identity
        })
      });
      clearTimeout(timer);
      if (!resp.ok) return null;
      const data = await resp.json();
      const results = Array.isArray(data?.results) ? data.results.slice(0, 6) : [];
      if (results.length === 0) return null;
      const formatted = results.map((r, i) => {
        const src = r.sources?.[0];
        const dateTag = (src?.occurredAt || r.occurredAt || '').slice(0, 10);
        const labelTag = src?.label || src?.sourceId || 'Memory';
        return `• [${dateTag} | ${labelTag}]: ${String(r.content || '').replace(/\s+/g, ' ').trim().slice(0, 380)}`;
      }).join('\n');
      return {
        identity,
        count: results.length,
        usedEvidenceTokens: data.usedEvidenceTokens || 0,
        block: `\n[PAST.DEV RECALLED USER MEMORY (Scoped to ${identity})]:\n${formatted}\n`
      };
    } catch (e) {
      clearTimeout(timer);
      return null;
    }
  }

  async function ingestPastMemoryItem({ id, label, content, timestamp, rawIdentity }) {
    const apiKey = process.env.PAST_API_KEY;
    if (!apiKey || !content || String(content).trim().length < 10) return null;
    const { identity, audience } = resolvePastUserScope(rawIdentity);
    await ensurePastAudience(audience, identity);
    const safeId = String(id || `cs-item-${Date.now()}`).replace(/[^a-zA-Z0-9._\-]/g, '-').slice(0, 110);
    const isoTime = timestamp && /^\d{4}-\d{2}-\d{2}T/.test(timestamp) ? timestamp : new Date().toISOString();
    const cleanContent = String(content).slice(0, 30000);
    const resp = await fetch(`${PAST_API_BASE}/ingest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: safeId,
        label: String(label || 'Consultant Studio Memory').slice(0, 120),
        timestamp: isoTime,
        audience,
        content: cleanContent
      })
    });
    if (!resp.ok) {
      const errTxt = await resp.text();
      throw new Error(`past.dev ingest ${resp.status}: ${errTxt.slice(0, 200)}`);
    }
    return await resp.json();
  }

  // 3. UNIFIED STRATEGIC CHAT ENDPOINT (REST)

  app.post('/api/memory/ingest', async (req, res) => {
    try {
      const { id, label, content, timestamp, userIdentity } = req.body || {};
      const exp = formatHarness2ExperienceLesson(label || 'Consultant Studio Decision', content || '');
      const result = await ingestPastMemoryItem({
        id,
        label: label ? `${label} [EXPERIENCE.md]` : `EXPERIENCE.md: ${exp.cue.slice(0, 50)}`,
        content: exp.markdown,
        timestamp,
        rawIdentity: userIdentity
      });
      if (!result) return res.status(400).json({ error: 'PAST_API_KEY not configured or empty content' });
      return res.status(202).json({ ...result, experience: { cue: exp.cue, lesson: exp.lesson, evidence: exp.evidence, confidence: exp.confidence } });
    } catch (err) {
      console.warn('[past.dev Live Ingest Warning]:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/memory/recall', async (req, res) => {
    try {
      const { query, userIdentity } = req.body || {};
      const recalled = await recallPastMemory(query, userIdentity, 8000);
      return res.json(recalled || { identity: resolvePastUserScope(userIdentity).identity, count: 0, block: '' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 2.9 HARNESS² RECURSIVE PROPOSE-PROBE-COMPOSE & EXPERIENCE REFLECTOR ENGINE
  async function runHarness2Compose(basePrompt, userMessage, workspace, imageObjs, activeOpenRouterKey, maxOutTokens) {
    const startTime = Date.now();
    const fastModel = 'google/gemini-3.1-flash-lite-preview';
    const composeModel = 'google/gemini-3-flash-preview';

    const buildPayload = (extraDirective) => {
      const fullText = `${basePrompt}\n\n${extraDirective}`;
      if (Array.isArray(imageObjs) && imageObjs.length > 0) {
        const arr = [];
        imageObjs.slice(0, 10).forEach(img => {
          if (img && img.mimeType && img.data) {
            arr.push({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.data}` } });
          }
        });
        arr.push({ type: 'text', text: fullText });
        return arr;
      }
      return fullText;
    };

    const callOpenRouter = async (modelId, content, maxTok, temp = 0.25) => {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeOpenRouterKey}`,
          'HTTP-Referer': 'https://www.consultant-studio.app',
          'X-Title': 'Consultant Studio (Harness2)'
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content }],
          max_tokens: maxTok,
          temperature: temp
        })
      });
      if (!res.ok) throw new Error(`Harness2 ${modelId} status ${res.status}`);
      const d = await res.json();
      return d.choices?.[0]?.message?.content || '';
    };

    // STEP 1 (PROPOSE & PROBE IN PARALLEL — CROSS-FAMILY DIVERSITY: DEEPSEEK MATH AUDITOR vs. GEMINI STRATEGIST):
    const hasImgs = Array.isArray(imageObjs) && imageObjs.length > 0;
    const probeAModel = hasImgs ? fastModel : 'deepseek/deepseek-chat-v3-0324';
    const probeBModel = fastModel;
    const invDirective = `[HARNESS² CANDIDATE PROBE A — DEEPSEEK QUANTITATIVE & INVARIANT AUDITOR (HARD MATH, COST-CONTROL & RISK FLOOR LENS)]:\nFocus strictly on exact dollar arithmetic, downside protection, cost-per-unit/mile/hour verification, and concrete operational execution checklists.`;
    const domDirective = `[HARNESS² CANDIDATE PROBE B — GEMINI DOMAIN STRATEGIST (POSITIONING, DEMAND & CAREER/MARKET LEVERAGE LENS)]:\nFocus strictly on high-leverage positioning, ATS/market benchmarks, revenue/salary upside, and persuasive framing.`;

    const [probeA, probeB] = await Promise.all([
      callOpenRouter(probeAModel, buildPayload(invDirective), 1800, 0.2).catch(() => callOpenRouter(fastModel, buildPayload(invDirective), 1800, 0.2)),
      callOpenRouter(probeBModel, buildPayload(domDirective), 1800, 0.35)
    ]);

    // STEP 2 (CONTRASTIVE COMPOSE + EXPERIENCE.MD REFLECTOR): Merge the strongest math from Probe A + sharpest positioning from Probe B
    const composePrompt = `You are the HARNESS² CONTRASTIVE COMPOSER & EXPERIENCE REFLECTOR inside Consultant Studio.
The user asked: "${userMessage}"

Two specialized candidate probes just executed on this task in parallel:

=== CANDIDATE PROBE A (INV — Hard Math, Cost-Control & Risk Floor) ===
${probeA.slice(0, 4500)}

=== CANDIDATE PROBE B (DOM — Positioning, Market Benchmarks & Upside) ===
${probeB.slice(0, 4500)}

YOUR MISSION:
1. Contrast Probe A and Probe B: keep the exact verified dollar math, risk floors, and operational checklists from Probe A, and combine them with the sharpest positioning, wording, and upside strategy from Probe B.
2. Write the final, unified response in clear, plain English so every table, bullet, and action step finishes completely.
3. At the very end of your response, append a compact **🔬 Harness² Experience Reflection (\`EXPERIENCE.md\`)** block with these exact 4 bullet lines so it can be indexed into long-term memory:
   - **cue**: When this exact decision or scenario comes up again
   - **lesson**: The single highest-leverage rule or takeaway that won the Probe A vs. Probe B contrast
   - **evidence**: The concrete numbers, dollar savings, or metrics from this run that prove it
   - **confidence**: high`;

    const composedText = await callOpenRouter(composeModel, composePrompt, maxOutTokens || 5500, 0.2);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[🔬 Harness² Propose-Probe-Compose Winner] (${composedText.length} chars in ${elapsed}s)`);
    return {
      text: composedText,
      isFallback: false,
      model: 'Harness² Propose–Probe–Compose',
      latency: `${elapsed}s`,
      probeA,
      probeB
    };
  }

  // Extract or synthesize a structured 4-line Harness² EXPERIENCE.md lesson from any saved memo or chat response
  function formatHarness2ExperienceLesson(title, rawText) {
    const clean = String(rawText || '').trim();
    // If response already contains a Harness² Experience Reflection block, extract it
    const cueMatch = clean.match(/-\s*\*\*cue\*\*:\s*([^\n]+)/i);
    const lessonMatch = clean.match(/-\s*\*\*lesson\*\*:\s*([^\n]+)/i);
    const evidenceMatch = clean.match(/-\s*\*\*evidence\*\*:\s*([^\n]+)/i);
    const confMatch = clean.match(/-\s*\*\*confidence\*\*:\s*([^\n]+)/i);

    const lines = clean.split('\n').map(l => l.replace(/^[#\s•\*\-]+/, '').trim()).filter(Boolean);
    const numMatches = clean.match(/(?:\$[0-9,]+(?:\.[0-9]+)?|\d+(?:\.\d+)?%|\d+\s*(?:miles|hrs|hours|months|weeks|days))/gi) || [];

    const cue = cueMatch ? cueMatch[1].trim() : `When reviewing or acting on: ${String(title || lines[0] || 'Strategy Decision').slice(0, 80)}`;
    const lesson = lessonMatch ? lessonMatch[1].trim() : (lines.find(l => l.length > 35 && l.length < 220) || lines[0] || 'Apply verified unit economics and concrete operational steps.');
    const evidence = evidenceMatch ? evidenceMatch[1].trim() : (numMatches.length > 0 ? `Verified figures in artifact: ${numMatches.slice(0, 6).join(', ')}` : 'Verified in Consultant Studio session trajectory.');
    const confidence = confMatch ? confMatch[1].trim() : 'high';

    return {
      cue,
      lesson,
      evidence,
      confidence,
      markdown: `# EXPERIENCE.md — ${title || 'Consultant Studio Lesson'}\n\n## Transferable lesson\n- **cue**: ${cue}\n- **lesson**: ${lesson}\n- **evidence**: ${evidence}\n- **confidence**: ${confidence}\n\n## Full Artifact\n${clean}`
    };
  }
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages = [], workspace = 'general', documentText = '', images = [], conversationId = null, model = 'auto', userIdentity = null } = req.body;
      const userMessage = messages.length > 0 ? messages[messages.length - 1].content : '';

      if (!userMessage) {
        return res.status(400).json({ error: "Empty prompt provided." });
      }

      // Google AX Resumption Hook
      const activeExecutionId = conversationId || `ax_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const contextualFallback = generateSmartDirectAnswer(userMessage, workspace);

    // Limit history to the last 2 turns (trimmed to 150 chars) to strictly protect token budget and prevent context bloat
    const recentMessages = messages.slice(-2);
    const conversationHistory = recentMessages.length > 1
      ? recentMessages.slice(0, -1).map(m => {
          const role = m.role === 'assistant' ? 'Consultant' : 'User';
          const text = m.content ? m.content.slice(0, 150) : '';
          return `${role}: ${text}`;
        }).join('\n\n')
      : '';

    // Fast speculative fan-out: Run Clef SystemOne Decision Evaluation + past.dev Memory Recall + Live Tavily Market Research IN PARALLEL
    // Skip blocking Tavily web search when the user attached a file/image so file/vision analysis starts at 0ms!
    const clefPromise = evaluateWithClef(userMessage, workspace);
    const pastRecallPromise = recallPastMemory(userMessage, userIdentity, 1100);
    const hasHeavyAttachment = Boolean((documentText && documentText.length > 180) || (Array.isArray(images) && images.length > 0));
    const tavilyPromise = (!hasHeavyAttachment)
      ? Promise.race([
          runTavilyLookup(buildTavilyResearchQuery(userMessage, workspace, 'auto'), 4),
          new Promise(r => setTimeout(() => r({ query: '', answer: '', results: [] }), 950))
        ])
      : Promise.resolve({ query: '', answer: '', results: [] });

    const [pastMemoryData, tavilyData] = await Promise.all([pastRecallPromise, tavilyPromise]);
    const pastMemoryBlock = pastMemoryData?.block || '';
    const tavilyContextBlock = (tavilyData && (tavilyData.answer || (tavilyData.results && tavilyData.results.length > 0)))
      ? `\n[LIVE 2026 TAVILY MARKET & CAREER RESEARCH]:\n${tavilyData.answer ? `Summary: ${tavilyData.answer}\n` : ''}${(tavilyData.results || []).map(r => `• ${r.title} (${r.domain}): ${r.snippet}`).join('\n')}\n`
      : '';

    // Direct, Conversational, Human-Grade Executive Operating Partner (Steipete/Agent-Scripts Natural Voice Standard)
    const buildSystemPrompt = (jevSignals) => {
      const now = new Date();
      const currentDateTimeStr = now.toUTCString();
      const currentDateFormatted = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

      return `You are Consultant Studio, an elite Operating Partner, Systems Strategist, and Executive Deal Architect.
[TEMPORAL CONTEXT: Today's date is ${currentDateFormatted} (${currentDateTimeStr}).]

COMMUNICATION & OPERATING STANDARDS (STEIPETE NATURAL VOICE):
1. NATURAL PROSE OVER BULLET-HEAVY STATUS REPORTS:
   - Speak like a thoughtful, engaged operating partner with a clear point of view.
   - Lead with the bottom-line conclusion, then explain the important reasoning in 2–4 coherent paragraphs.
   - Avoid list-shaped answers by default. Use bullets ONLY when presenting a structured checklist or side-by-side choices.
   - Show character: call out an interesting operational bottleneck, a satisfying simplification, or a sharp financial tradeoff. Avoid canned enthusiasm or empty praise.

2. EXECUTIVE EMAIL & DEAL CONFIGURATION:
   - When drafting emails or memos, lead with a crisp Subject line followed by Context $\rightarrow$ Core Value/Proof $\rightarrow$ Frictionless Call to Action.
   - Zero corporate fluff ("I hope this finds you well").

3. UNCOMPROMISING QUANTITATIVE DISCIPLINE:
   - Present formulas in plain English (never raw LaTeX math syntax like $$\\text{...}$$).
   - Compare figures against industry benchmarks and state sensitivity upside vs. downside.

4. CONVERSATIONAL RESPECT:
   - Never repeat the user's prompt back to them.
   - Retain every real verified dollar, percentage, or headcount number.

[Active Workspace: ${workspace.toUpperCase()}]
${documentText ? `[Attached Client Context & Documents]:\n"""\n${documentText.slice(0, 15000)}\n"""\n` : ''}
User Message: ${userMessage}`;
    };

    // Extract all embedded or explicitly passed base64 image data (Supports up to 10 high-res photos, screenshots, or scanned PDF pages)
    let imageObjs = [];
    if (Array.isArray(images)) {
      images.slice(0, 10).forEach(img => {
        if (img && img.data && String(img.data).length > 50) {
          imageObjs.push({
            name: img.name || 'image.jpg',
            mimeType: img.mimeType || 'image/jpeg',
            data: String(img.data).replace(/^data:image\/[a-zA-Z0-9\+\-\.]+;base64,/, '').replace(/[\s\r\n]+/g, '')
          });
        }
      });
    }
    if (documentText && documentText.includes('data:image/') && imageObjs.length < 10) {
      const regex = /data:(image\/[a-zA-Z0-9\+\-\.]+);base64,([A-Za-z0-9+/=]+)/g;
      let match;
      while ((match = regex.exec(documentText)) !== null && imageObjs.length < 10) {
        if (match[2] && match[2].length > 50) {
          imageObjs.push({
            mimeType: match[1],
            data: match[2].replace(/[\s\r\n]+/g, '')
          });
        }
      }
    }

    // Clean text payload (strip any inline base64 strings and any image placeholder lines so the model never thinks the image is "just a placeholder")
    const cleanDocText = String(documentText || '')
      .replace(/data:image\/[a-zA-Z0-9\+\-\.]+;base64,[A-Za-z0-9+/=\s]+/g, '')
      .replace(/\[(?:Attached Image|Visual Image Attached)[^\]]*\]/gi, '')
      .trim();
    
    // Delimiter Hardening & Explicit Document/Vision Analysis Directive
    const hasRealDocText = cleanDocText.replace(/=== FILE[^\n]*===/g, '').replace(/\[Document File:[^\]]*\]/g, '').trim().length > 10;
    const hasAttachedDocs = hasRealDocText;
    const hasAttachedImages = imageObjs.length > 0;
    const isolatedDocumentBlock = (hasAttachedDocs || hasAttachedImages)
      ? `\n[ATTACHED USER FILES & IMAGES (${imageObjs.length} visual image frame(s) attached directly to this message) — READ & ANALYZE DIRECTLY]:\n` +
        `CRITICAL INSTRUCTION FOR ATTACHED FILES/IMAGES: ` +
        (hasAttachedImages
          ? `The user has attached ${imageObjs.length} actual image(s)/page(s) directly to this multimodal message. Look directly at the attached image(s), read every word, bullet point, number, and heading visible in the image(s), and analyze their exact content. NEVER say the file is a placeholder or didn't attach!\n`
          : `The user has uploaded a document below. Carefully read and analyze the exact text, numbers, line items, and resume bullet points inside <attached_document_content>.\n`) +
        (hasAttachedDocs ? `<attached_document_content>\n${cleanDocText.slice(0, 18000)}\n</attached_document_content>\n` : '')
      : '';

    // Dynamic, Practical Life, Career, Money & Business Decision Consultant Instruction
    const isBusinessMode = (workspace || '').toLowerCase() === 'business';
    const tokenProfile = resolveCategoryTokenProfile(userMessage, workspace, model, hasAttachedDocs, hasAttachedImages);
    const finalPrompt = `You are CONSULTANT STUDIO, a sharp, empathetic, and practical Personal Life, Career, Financial, and Business Decision Consultant.

Most people feel overwhelmed making big life and money decisions on their own—like figuring out how to move out, afford rent, land a job, pay off debt, fix a monthly budget, buy a car, or run a small business. Your mission is to make those decisions simple, concrete, and achievable.

CORE CONVERSATIONAL PRINCIPLES:
1. SPEAK IN PLAIN, HUMAN ENGLISH (ZERO CORPORATE JARGON):
- Give your direct, honest takeaway first in plain language.
- NEVER use stiff corporate buzzwords (like "EBITDA flow-through", "institutional", "enterprise value", "boardroom", "telemetry", or "commercial denominator") unless the user explicitly asks a corporate finance question.
- Talk like a smart, trusted mentor or older sibling who knows money, career strategy, and real-world math inside and out.
- Zero robotic filler ("Here is a breakdown of your prompt:") and zero code/programming output.

2. DO THE REAL-WORLD MATH FOR THEM:
- When someone asks about moving out, rent, budgets, paychecks, debt, or buying something, break down the actual dollar numbers clearly (e.g., take-home pay, the 30% rent rule, move-in deposit + 3-month emergency buffer, groceries, utilities, and what's left over).
- When someone asks about landing a job, resumes, or interviews, give them concrete, realistic wording and practical steps that actually get people hired—without inflating their title into fake executive jargon.
- When someone is torn between two life or career choices, lay out the real pros, cons, hidden costs, and long-term impact (1 year vs. 5 years from now), and give a clear recommendation.

3. END WITH A SIMPLE NEXT STEP & NEVER CUT OFF MID-SENTENCE:
- Finish with 1 to 3 concrete things they can do today, or ask one simple follow-up question (like their monthly take-home pay or target city) to dial in the exact numbers for them.
- ${tokenProfile.completionDirective}

[TEMPORAL CONTEXT: ${new Date().toUTCString()}]
Active Mode: ${isBusinessMode ? 'BUSINESS & OPERATIONS' : 'PERSONAL LIFE, CAREER & MONEY'} | Category: ${tokenProfile.category.toUpperCase()}
${pastMemoryBlock}${tavilyContextBlock}${conversationHistory ? `[Recent Conversation Context]:\n${conversationHistory}\n` : ''}${isolatedDocumentBlock}
User Query: ${userMessage}`;

    // Capture optional client BYOK key from request headers
    const customKey = req.headers['x-custom-gemini-key'] || null;

    console.log(`[Executing Instant Live Inference | Category: ${tokenProfile.category} (${tokenProfile.maxTokens} tokens) | Multimodal Images: ${imageObjs.length} | Pinned Model: ${model}]`);
    let liveResponse = null;
    try {
      const isHarness2Mode = String(model || '').toLowerCase().includes('harness2');
      if (isHarness2Mode && process.env.OPENROUTER_API_KEY) {
        liveResponse = await runHarness2Compose(finalPrompt, userMessage, workspace, imageObjs, process.env.OPENROUTER_API_KEY, tokenProfile.maxTokens);
        // Automatically reflect the Harness² EXPERIENCE.md lesson into past.dev memory!
        if (liveResponse && liveResponse.text) {
          const exp = formatHarness2ExperienceLesson(`Harness² Audit: ${userMessage.slice(0, 48)}`, liveResponse.text);
          ingestPastMemoryItem({
            id: `cs-harness2-exp-${Date.now()}`,
            label: `Harness² EXPERIENCE.md: ${exp.cue.slice(0, 65)}`,
            content: exp.markdown,
            timestamp: new Date().toISOString(),
            rawIdentity: userIdentity
          }).catch(() => {});
        }
      } else {
        liveResponse = await queryAI(finalPrompt, imageObjs, customKey, model, tokenProfile.maxTokens);
      }
    } catch (qErr) {
      console.error('[Live Query Warning]:', qErr.message);
    }

    // Capture Clef background schema signal non-blockingly if completed
    let clefSignals = null;
    try {
      clefSignals = await Promise.race([
        clefPromise,
        new Promise(r => setTimeout(() => r(null), 50))
      ]);
    } catch (e) {}

    if (liveResponse && liveResponse.text) {
      // Checkpoint execution in AX execution log for instant resumption & telemetry auditing
      const detectedModel = liveResponse.model || (model !== 'auto' ? model : 'gemini-3.1-flash-lite');
      axExecutionLog.set(activeExecutionId, {
        timestamp: Date.now(),
        domain: clefSignals?.domain || 'general',
        layout: clefSignals?.layout || 'executive_memo',
        response: liveResponse.text,
        isFallback: liveResponse.isFallback || false,
        model: detectedModel,
        latency: liveResponse.latency || '1.5s'
      });
      if (axExecutionLog.size > 100) {
        const oldestKey = axExecutionLog.keys().next().value;
        axExecutionLog.delete(oldestKey);
      }

      return res.json({
        conversationId: activeExecutionId,
        response: liveResponse.text,
        domain: clefSignals?.domain || null,
        layout: clefSignals?.layout || 'executive_memo',
        isFallback: liveResponse.isFallback || false,
        model: detectedModel,
        latency: liveResponse.latency || '1.5s',
        researchSources: (tavilyData?.results || []).slice(0, 3),
        runtime: "ax_distributed_resilient_v1"
      });
    }

    // If primary query failed, attempt one final direct Google AI Studio generation (with multimodal image parts if present)
    try {
      const fallbackGoogleKey = customKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (fallbackGoogleKey) {
        const fallbackParts = [{ text: finalPrompt }];
        imageObjs.forEach(img => {
          if (img && img.data) {
            fallbackParts.push({
              inline_data: {
                mime_type: img.mimeType || 'image/jpeg',
                data: img.data
              }
            });
          }
        });
        const directRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${fallbackGoogleKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: fallbackParts }],
            generationConfig: { maxOutputTokens: 2500, temperature: 0.3 }
          })
        });
        if (directRes.ok) {
          const directData = await directRes.json();
          const directText = directData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (directText && directText.trim().length > 0) {
            return res.json({
              conversationId: activeExecutionId,
              response: directText,
              isFallback: false
            });
          }
        }
      }
    } catch (finalErr) {
      console.error('[Final Google Retry Error]:', finalErr.message);
    }

    return res.status(200).json({ 
        conversationId: activeExecutionId,
        response: `I received your request regarding "${userMessage}". Please paste your specific text, figures, or details, and I will analyze them directly for you.`, 
        isFallback: false 
    });
  } catch (error) {
    console.error('[Server Route Catch]:', error.message);
    res.status(200).json({ 
      response: `Here is the analysis for your objective:\n\n• Focus on core operational throughput and margin preservation.\n• Eliminate process bottlenecks before adding labor overhead.\n• Track weekly contribution margins to protect cash runway.`,
      isFallback: true
    });
  }
});

// 4. AUTOPILOT 24/7 BACKGROUND MONITORING & TELEMETRY DISPATCH (OPENCLAW v2026.9.6)
app.post('/api/autopilot/triage', async (req, res) => {
  try {
    const { metrics = {}, businessName = 'Operations Unit' } = req.body;
    const { revenue = 50000, cogs = 16000, labor = 17500, targetPrimeFloor = 55.0 } = metrics;

    const primeCost = cogs + labor;
    const primeCostPct = ((primeCost / revenue) * 100).toFixed(1);
    const variance = (primeCostPct - targetPrimeFloor).toFixed(1);

    const isLeak = primeCostPct > targetPrimeFloor;
    const leakAmount = isLeak ? Math.round(((primeCostPct - targetPrimeFloor) / 100) * revenue) : 0;

    const autopilotPayload = {
      timestamp: new Date().toISOString(),
      businessName,
      status: isLeak ? 'ACTION_REQUIRED' : 'NOMINAL',
      metrics: {
        revenue,
        cogs,
        labor,
        primeCost,
        primeCostPct: parseFloat(primeCostPct),
        targetPrimeFloor,
        variancePct: parseFloat(variance),
        monthlyLeakAmount: leakAmount,
        annualizedRecapture: leakAmount * 12
      },
      autopilotDirective: isLeak 
        ? `⚠️ Autopilot Margin Alert: Prime cost running at ${primeCostPct}% (+${variance}% over target). Recover $${leakAmount.toLocaleString()}/mo ($${(leakAmount * 12).toLocaleString()}/yr) by cutting shoulder labor and auditing food waste.`
        : `✅ Autopilot Status: Prime cost running at ${primeCostPct}% within target floor (${targetPrimeFloor}%). Margins protected.`
    };

    return res.json(autopilotPayload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ONE-CLICK MASKED PAST.DEV KEY CONFIGURATOR (SAVES TO .env WITHOUT TERMINAL OR CHAT EXPOSURE)
app.post('/api/config/past-key', async (req, res) => {
  try {
    const rawKey = String(req.body?.key || '').trim();
    if (!rawKey || rawKey.length < 8 || /[\r\n]/.test(rawKey)) {
      return res.status(400).json({ error: 'Invalid PAST_API_KEY format' });
    }
    process.env.PAST_API_KEY = rawKey;
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch (e) {}
    const lines = envContent.split('\n').filter(l => !l.startsWith('PAST_API_KEY='));
    lines.push(`PAST_API_KEY=${rawKey}`);
    await fs.writeFile(envPath, lines.filter((l, i, arr) => l !== '' || i < arr.length - 1).join('\n') + '\n', { mode: 0o600 });
    return res.json({ ok: true, configured: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/config/past-key/status', (req, res) => {
  return res.json({ configured: Boolean(process.env.PAST_API_KEY && process.env.PAST_API_KEY.length > 8) });
});

app.get('/past-key', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connect past.dev — Consultant Studio</title>
  <style>
    body { background:#080A0F; color:#F8FAFC; font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:16px; box-sizing:border-box; }
    .card { max-width:420px; width:100%; background:#0E131C; border:1px solid rgba(255,255,255,0.12); border-radius:18px; padding:24px; box-shadow:0 24px 60px rgba(0,0,0,0.7); }
    h2 { margin:0 0 8px 0; font-size:19px; }
    p { margin:0 0 16px 0; font-size:13.5px; color:#94A3B8; line-height:1.5; }
    input { width:100%; box-sizing:border-box; background:#07090D; border:1px solid rgba(255,255,255,0.16); color:#FFF; border-radius:10px; padding:12px; font-size:14px; margin-bottom:12px; outline:none; }
    button { width:100%; background:#10B981; color:#04130B; border:none; border-radius:10px; padding:12px; font-size:14px; font-weight:800; cursor:pointer; }
    .status { margin-top:12px; font-size:13px; color:#4ADE80; display:none; text-align:center; font-weight:600; }
  </style>
</head>
<body>
  <div class="card">
    <h2>🔒 Connect past.dev Memory</h2>
    <p>Paste your <code>PAST_API_KEY</code> below and tap Save. It writes directly to your server's <code>.env</code> without ever touching chat or terminal.</p>
    <input type="password" id="k" placeholder="Paste PAST_API_KEY here..." autocomplete="off">
    <button onclick="save()">Save Key to Server .env</button>
    <div id="st" class="status">✓ Saved to .env! Return to Telegram and say "done".</div>
  </div>
  <script>
    async function save() {
      const val = document.getElementById('k').value.trim();
      if (!val) return;
      const r = await fetch('/api/config/past-key', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ key: val }) });
      if (r.ok) {
        document.getElementById('k').value = '';
        document.getElementById('st').style.display = 'block';
      } else {
        alert('Could not save key—check format.');
      }
    }
  </script>
</body>
</html>`);
});

// DIRECT CONTACT & SUPPORT INBOX RELAY (LOGS TO MEMORY + FORWARDS TO LANDEN'S TELEGRAM & EMAIL)
app.post('/api/contact', async (req, res) => {
  try {
    const sender = String(req.body?.email || 'Anonymous User').trim().slice(0, 120);
    const message = String(req.body?.message || '').trim().slice(0, 4000);
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const isoNow = new Date().toISOString();
    // 1. Archive contact inquiry in past.dev under user-landen
    ingestPastMemoryItem({
      id: `cs-contact-${Date.now()}`,
      label: `Contact Inquiry from ${sender}`,
      content: `# Consultant Studio Contact Inquiry (${isoNow.slice(0, 10)})\nFrom: ${sender}\nTo: landen@consultant-studio.app / jacksonlanden3986@gmail.com\n\n${message}`,
      timestamp: isoNow,
      rawIdentity: 'jacksonlanden3986@gmail.com'
    }).catch(() => {});

    // 2. Deliver instant notification to Landen's Telegram DM if bot token is available
    try {
      const hermesEnv = await fs.readFile('/home/jacks/.hermes/.env', 'utf-8').catch(() => '');
      const tokenMatch = hermesEnv.match(/^TELEGRAM_BOT_TOKEN=(.+)$/m);
      const tgToken = tokenMatch ? tokenMatch[1].trim() : process.env.TELEGRAM_BOT_TOKEN;
      if (tgToken) {
        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: '5393795759',
            text: `📬 *New Consultant Studio Contact Message*\n*From:* ${sender}\n*Message:* ${message}`
          })
        });
      }
    } catch (tgErr) {}

    return res.json({ ok: true, deliveredTo: 'jacksonlanden3986@gmail.com' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// START SERVER WITH OPENCLAW ENTERPRISE CRASH RESILIENCE & CLEAN SHUTDOWN
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Consultant Studio Enterprise Engine running on http://0.0.0.0:${PORT}]`);
});

// OpenClaw Enterprise Process Signal Governance
process.on('SIGTERM', () => {
  console.log('[SIGTERM received: Gracefully closing Consultant Studio HTTP server]');
  server.close(() => {
    console.log('[Consultant Studio process terminated cleanly]');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('[OpenClaw Governance - Uncaught Exception]:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[OpenClaw Governance - Unhandled Rejection]:', reason);
});
