# Consultant Studio 🚀

> **Strategic Executive Intelligence & Telemetry Platform for Modern Operators**  
> *AI builds the computational skeleton; human operators hold the judgment, ethics, and strategic decision gate.*

[![Live App](https://img.shields.io/badge/Google_AI_Studio-Live_App-22C55E?style=for-the-badge&logo=google)](https://consultant-studio.ai.studio/)
[![Cloudflare Edge](https://img.shields.io/badge/Cloudflare_Pages-Edge_Deployed-F38020?style=for-the-badge&logo=cloudflare)](https://consultant-studio.ai.studio)
[![Model](https://img.shields.io/badge/Engine-Google_Gemini_3.8_Flash-4285F4?style=for-the-badge&logo=google)](https://aistudio.google.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

## ⚡ Overview

**Consultant Studio** is an institutional-grade business strategy, unit economics modeling, and trade-area intelligence application designed for founders, business operators, and management consultants. 

Unlike conversational consumer AI chatbots that produce generic text, Consultant Studio delivers **boardroom-ready, structured strategic memoranda** with isolated quantitative telemetry (`[METRIC] = [VALUE]`), real-time trade signals via Tavily, and an enforced **Human-in-the-Loop Orchestration Gate**.

---

## 🛡️ Core Capabilities & Modules

| Module | Operational Focus | Output Telemetry |
| :--- | :--- | :--- |
| **01 // Trade Area Geometry** | Local retail catchment, pedestrian foot-traffic, and zero-discount pricing power. | `Neighborhood Capture Target`, `Trade Area Density`, `Margin Defense Score` |
| **02 // Trust & Copy Audit** | Scans marketing copy, sales funnels, and brand narratives for trust bottlenecks. | `Trust Alignment Score`, `Brand Risk Level`, `Human Verification Gate` |
| **03 // Unit Economics** | B2B SaaS ladders ($15.99 / $39.99 / $79.99), CAC compression, and margin health. | `Blended Target CAC`, `LTV:CAC Ratio`, `CAC Payback Velocity`, `NRR` |
| **04 // Campaign Strategy** | High-texture brand storytelling and seasonal launches without promotional discounting. | `Organic Word-of-Mouth Lift`, `Ticket Size Expansion`, `Attachment Rate` |
| **05 // Competitor Recon** | Real-time competitive vulnerability scans and defensive moat engineering. | `Market Differentiation Index`, `Pricing Spread`, `Switching Barriers` |
| **06 // Pricing Architecture** | Value-based pricing ladders, premium anchoring, and menu/plan margin defense. | `Target Gross Margin`, `Price Inelasticity`, `High-Tier Mix Target` |
| **07 // SPSS Trust Score** | Empirical statistical modeling isolating consumer privacy friction ($p < .001, r = 0.38$). | `Empirical Trust Boundary`, `Statistical Risk (p-val)`, `Data Sovereignty` |
| **08 // Custom Objective** | Bespoke client missions, operational troubleshooting, and scenario modeling. | `Objective Target`, `Execution Velocity Multiplier`, `Capital ROI` |

---

## 🏗️ Architecture & Tech Stack

```
[ Client Browser / PWA ]
          │
          └──> Static assets served from public/
                     │
                     ▼
          [ Node.js 24 / Express (server.js) ]
                ├──> Google Generative Language API (when configured)
                ├──> Optional MyClaw / Typesafe gateways
                └──> Stripe Checkout and webhook (when configured)
```

* **Frontend:** A static PWA served from `public/`, with local browser storage for the strategy vault and workspace profile.
* **Inference:** The Express server calls Google directly when a `GEMINI_API_KEY` is configured, with optional gateway integrations; without available providers, chat uses a local fallback.
* **Billing:** Stripe Checkout and webhook endpoints are implemented in `server.js`; configure the Stripe secrets before enabling live billing.
* **Deployment:** This repository starts an Express server with `npm start`. No Cloudflare Pages/Workers deployment configuration is included here.

---

## 🚀 Quick Start & Local Setup

### Prerequisites
* Node.js v24 (matches the `engines` declaration in `package.json`)
* A Google AI Studio API key (`GEMINI_API_KEY`) for live AI responses. Without it, chat uses a local fallback.
* Stripe credentials are only needed to use billing.

### Installation

```bash
# Clone the repository
git clone https://github.com/landenjackson/consultant.git
cd consultant

# Install dependencies
npm install

# Create a .env file for the integrations you plan to use
```

Configure `.env` as needed:
```env
PORT=3000
GEMINI_API_KEY="your_google_ai_studio_api_key"
MYCLAW_API_KEY="your_fallback_gateway_key"
STRIPE_SECRET_KEY="your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="your_stripe_webhook_secret"
```

### Run Locally

```bash
# Start the local development server
npm start

# Access the studio at:
http://localhost:3000
```

---

## 📖 The Operator's Standard

Consultant Studio is built on three immutable operational principles:
1. **Research-First Intelligence:** Eliminating guesswork by grounding every consultation in live market data from Day 1.
2. **The Human-in-the-Loop Quality Moat:** Technology constructs the data skeleton; human operators hold the judgment, ethics, and strategic decision gate.
3. **Absolute Data Sovereignty:** Isolated private execution pipelines with zero public LLM training exposure.

Read the full essay: [The Illusion of Autopilot: Why Strategic Orchestration Wins](https://consultant-studio.ai.studio/#creed-section)

---

## 👨‍💻 Author & Maintainer

**Landen Jackson (LANDØ)**  
*FSU Marketing Graduate | Eagle Scout | Google AI Certified Professional*  
* [LinkedIn](https://www.linkedin.com/in/landen-jackson/) • [Live App](https://consultant-studio.ai.studio/) • [Portfolio](https://consultant-studio.ai.studio/#portfolio-section)

*"No guru, just shippin'."* ⚓️
