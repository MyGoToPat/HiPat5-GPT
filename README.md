PatUIJuly8

**Edge + Frontend wiring (Aug 2025)**
Frontend now calls `openai-chat` and `openai-food-macros` via `supabase.functions.invoke` using thin wrappers in `src/lib/chat.ts` and `src/lib/food.ts`. Manual headers for functions are removed (invoke handles auth). When moving to **hipat.app**, update the `ALLOWED_ORIGINS` Edge secret to include `https://hipat.app` and remove temporary Netlify/localhost entries. Health probe already posts correct payloads to both functions.

## Edge Integration: wrappers + health
- Frontend now calls openai-chat & openai-food-macros via `supabase.functions.invoke` through wrappers in `src/lib/chat.ts` and `src/lib/food.ts`.
- Removed manual Authorization/apikey headers from the frontend; auth handled by Supabase client.
- Health page updated to POST valid bodies to both functions; /health?writeTest=1 returns 200 for chat & food.
- Deploy-time note: When moving to `https://hipat.app`, update Edge secret `ALLOWED_ORIGINS` to include `https://hipat.app` and remove temporary `https://deft-sunflower-3f8e74.netlify.app` and `http://localhost:5173`.
## Edge + Frontend Wiring