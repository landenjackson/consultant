# Consultant - Telegram Mini App

Your AI assistant powered by Gemini 2.0 Flash.

## Setup

1. Get your myclaw.ai API key
2. Update `index.html` with your API key and endpoint
3. Deploy to Vercel or any static host

## Deploy to Vercel

```bash
# Install Vercel CLI (optional)
npm i -g vercel

# Deploy
cd consultant
vercel
```

Or drag and drop the folder at vercel.com

## Telegram Mini App Setup

1. Talk to @BotFather on Telegram
2. Create a bot: `/newbot`
3. Create mini app: `/newapp`
4. Enter your Vercel URL

## Files

- `index.html` - The mini app interface
- `README.md` - This file

## API Configuration

In `index.html`, update:
```javascript
const API_KEY = 'YOUR_MYCLAW_API_KEY';
const API_URL = 'https://api.myclaw.ai/v1/chat/completions';
```

## Model

- MiniMax-M3 via myclaw.ai
- 1% commission on usage

## Features

- Chat interface
- Powered by Gemini 2.0 Flash
- Optimized for Telegram mobile

---

Made by @lando