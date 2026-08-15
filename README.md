# GLAM AI Coach Bridge

This repository is designed to deploy directly to Netlify from GitHub.

## Required Netlify environment variable

OPENAI_API_KEY = your OpenAI API key

Optional:

OPENAI_COACH_MODEL = gpt-4.1-mini

## Function URL after deploy

https://YOUR-SITE.netlify.app/.netlify/functions/coach-bridge

Put that full URL into your Generator Command Hub `config.js`:

AI_COACH_BRIDGE_URL: "https://YOUR-SITE.netlify.app/.netlify/functions/coach-bridge"

Do not put your OpenAI API key in `config.js`, `script.js`, `index.html`, or any browser file.
