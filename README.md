PatUIJuly8

**Edge + Frontend wiring (Aug 2025)**
Frontend now calls `openai-chat` and `openai-food-macros` via `supabase.functions.invoke` using thin wrappers in `src/lib/chat.ts` and `src/lib/food.ts`. Manual headers for functions are removed (invoke handles auth). When moving to **hipat.app**, update the `ALLOWED_ORIGINS` Edge secret to include `https://hipat.app` and remove temporary Netlify/localhost entries. Health probe already posts correct payloads to both functions.
## Edge + Frontend Wiring