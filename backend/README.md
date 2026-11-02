# Commission endpoint (Cloudflare Worker)

GitHub Pages can't run server code, so the commission form posts to this Worker. The Worker validates the request and sends it (and the reference image) to Telegram. The bot token never reaches the browser.

## Deploy
1. Create a Telegram bot with @BotFather → copy the token. Send your bot a message, then get your chat id (e.g. via `getUpdates`).
2. `cd backend && npx wrangler login`
3. `npx wrangler secret put TELEGRAM_BOT_TOKEN` and `npx wrangler secret put TELEGRAM_CHAT_ID`
4. Edit `ALLOWED_ORIGIN` in `wrangler.toml` to your exact site origin (no path, no trailing slash).
5. (Recommended) create a KV namespace, bind it as `RATE` in `wrangler.toml`. Without it, rate limiting and duplicate protection are **not active**.
6. `npx wrangler deploy` → note the `https://….workers.dev` URL.
7. In `index.html` set `data-endpoint="https://….workers.dev"` on `#commission-form`.
8. Test end-to-end (see below) before announcing the form.

## Contract
`POST multipart/form-data` — fields: `nickname, service, title, description, budget, idempotencyKey, elapsedMs, website (honeypot), image (optional)`.
Responses: `200 {ok:true}` · `4xx {ok:false,error}` · `429` rate limited · `502` Telegram failure. The site shows success only on `200 {ok:true}`.

## What it enforces
Origin allow-list · field lengths · service whitelist · image ≤ 5 MB with magic-byte check (JPG/PNG/WebP) · honeypot + minimum fill time · per-IP hourly limit and 24 h duplicate key (with KV) · HTML-escaped Telegram text.

## End-to-end test (required before use)
Submit the live form with and without an image and confirm both arrive in your Telegram with all fields; submit twice quickly to confirm the duplicate is ignored; submit a renamed .txt as .jpg to confirm rejection.
The automated tests in `../tests/` use a mocked Telegram and **do not replace** this test.
