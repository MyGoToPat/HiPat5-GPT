PatUIJuly8

**Edge + Frontend wiring (Aug 2025)**
Frontend now calls `openai-chat` and `openai-food-macros` via `supabase.functions.invoke` using thin wrappers in `src/lib/chat.ts` and `src/lib/food.ts`. Manual headers for functions are removed (invoke handles auth). When moving to **hipat.app**, update the `ALLOWED_ORIGINS` Edge secret to include `https://hipat.app` and remove temporary Netlify/localhost entries. Health probe already posts correct payloads to both functions.

## Edge Integration: wrappers + health
- Frontend now calls openai-chat & openai-food-macros via `supabase.functions.invoke` through wrappers in `src/lib/chat.ts` and `src/lib/food.ts`.
- Removed manual Authorization/apikey headers from the frontend; auth handled by Supabase client.
- Health page updated to POST valid bodies to both functions; /health?writeTest=1 returns 200 for chat & food.
- Deploy-time note: When moving to `https://hipat.app`, update Edge secret `ALLOWED_ORIGINS` to include `https://hipat.app` and remove temporary `https://deft-sunflower-3f8e74.netlify.app` and `http://localhost:5173`.
## Edge + Frontend Wiring

## Setup
1. `cp .env.example .env.local` and fill with your actual Supabase values
2. `npm ci`
3. `npm run dev`

## CI
- Every PR runs lint, tests, build, and pattern checks via GitHub Actions
- Run locally: `npm run ci:verify` (strict - fails on pattern hits)
- Run locally: `npm run ci:verify:soft` (reports only - doesn't fail)
- Pattern checks ensure no TopBar/Tabs/inline SVGs remain
- Note: In WebContainer, `git` is unavailable; use local terminal for commits/pushes

## Recent Chats (local)
- Chat threads stored in localStorage (up to 20 threads)
- First user message becomes thread title (≤60 chars)
- Access via Recent Chats section in navigation menu
- No server sync yet - purely local storage
- Run locally: `npm run ci:verify:soft` (reports only - doesn't fail)
- Pattern checks ensure no TopBar/Tabs/inline SVGs remain
- Note: In WebContainer, `git` is unavailable; use local terminal for commits/pushes

## Deploys via GitHub → Firebase Hosting
Required GitHub Secrets: FIREBASE_PROJECT_ID, FIREBASE_TOKEN
Add hipat.app as a custom domain in Firebase Hosting and verify DNS.
SPA rewrite serves /index.html for any path (e.g., /login).