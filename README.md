# Consultant

Your Executive Operations Partner and Strategic AI Companion.

## Overview
Consultant is a Surgical Executive AI application designed to provide high-density strategic intelligence. Unlike traditional chatbots, Consultant focuses on delivering finalized work products—plans, templates, and analytical briefings—grounded in mathematical reality and statistical proof.

## Key Features
- **Surgical Executive Engine:** Delivers dense, zero-fluff responses organized into Strategic Context, Math & Metrics, and Execution Steps.
- **Quantitative Anchoring:** Every recommendation is backed by real-world data and FSU MAR4613 research study findings ($p < .001$ trust gaps).
- **Progressive Web App (PWA):** Installable on iOS and Android for a native mobile experience.
- **Operator Philosophy:** Built for those who focus on shipping results over discussing theory.

## Tech Stack
- **Frontend:** Clean sans-serif (Inter) typography, premium dark gray palette.
- **Backend:** Node.js Express server running on PM2.
- **Infrastructure:** Self-hosted on VPS with Caddy reverse proxy and automatic SSL.
- **Intelligence:** Google Gemini 3.6 Flash via the Base44 SDK.

## Setup & Deployment
Consultant is optimized for self-hosting. 
1. Configure your environment variables in `.env` (requires `GEMINI_API_KEY` and `appId`).
2. Install dependencies: `npm install`.
3. Start the server: `pm2 start server.js`.
4. Proxy traffic through Caddy using the provided `Caddyfile` configuration.

---

Made by @lando | "No guru just shippin"⚓️
