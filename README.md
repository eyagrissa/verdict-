# Verdict / AI Studio

Compare AI model answers, preview interactive websites, refine with your own feedback, and create downloadable logo concepts.

## Run locally

1. Copy `.env.example` to `.env.local` and add server-side keys for [Groq](https://console.groq.com/keys), Llama (`LLAMA_API_KEY`), [Gemini](https://aistudio.google.com/apikey), [DeepSeek](https://platform.deepseek.com/api_keys), and/or [Claude](https://console.anthropic.com/settings/keys). Keep keys on the server; never put them in Angular environment files or commit them.
2. Start the API in the repository root:

   ```bash
   npm install
   npm run dev
   ```

3. In another terminal, start the frontend:

   ```bash
   cd angular-frontend
   npm install
   npm start
   ```

4. Open [http://localhost:4200](http://localhost:4200). The Angular dev server proxies API requests to Next.js on port 3000.

## Models and providers

The currently verified lineup has five text models: GPT-OSS 20B, GPT-OSS 120B, Qwen 3.8 27B, and ALLAM 2 7B on Groq, plus Llama 3.2 11B. All five passed live short-response tests with the configured account. Qwen's output is capped to stay below the account's observed output-token quota. Gemini, DeepSeek, and Claude adapters are available when you add the corresponding keys. Those providers have not been live-tested with this account and are only shown when configured. A configured key does not guarantee access, free usage, or quota. Provider rates, free tiers, and model access vary by account; check the current provider terms. Failures are shown rather than counted as model responses.

Use `GROQ_MODEL`, `LLAMA_MODEL`, `GEMINI_MODEL`, `DEEPSEEK_MODEL`, or `CLAUDE_MODEL` to change a provider's default. Their `*_MODELS` counterparts accept comma-separated IDs. The server attempts at most six unique targets.

## Creative output

Website requests return a complete standalone HTML page with its CSS and JavaScript together; interactive previews open automatically in the results. Use the star rating and change notes below a result to send feedback to all connected models for a new round. Session history can be deleted from the History page.

Logo results always include an inline, downloadable vector preview, including an instant custom fallback concept when a text model omits usable SVG. Use **Generate another concept** to explore a different colorful direction. With a Gemini API key, use **Generate AI image** for a separate raster illustration; its preview is shown inline when ready, without needing to download it first. Image generation may be billed to your Gemini account. Images are concepts, not guaranteed print-ready trademarks or transparent cutouts.

## Verify

```bash
npm run lint
npm run build
```

Build the Angular frontend separately with `cd angular-frontend && npm run build`.
