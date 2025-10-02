# Intelligent Chat - Deployment Checklist

## Quick Start (5 Minutes)

Your intelligent AI router is ready to deploy. Follow these steps:

---

## ✅ Step 1: Deploy Edge Function

Choose ONE method:

### Method A: Supabase CLI (Recommended)

```bash
# If you don't have Supabase CLI installed:
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref 0ec90b57d6e95fcbda19832f

# Deploy the function
supabase functions deploy intelligent-chat

# Set the API key
supabase secrets set GEMINI_API_KEY=AIzaSyDbbVpv4fTKyQVRU6T1vOv8HyqXqQhvqYI
```

### Method B: Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/0ec90b57d6e95fcbda19832f/functions
2. Click **"Create Function"**
3. Name: `intelligent-chat`
4. Copy entire contents of: `supabase/functions/intelligent-chat/index.ts`
5. Paste into editor and click **"Deploy"**
6. Go to **Settings → Edge Functions → Secrets**
7. Add secret:
   - Key: `GEMINI_API_KEY`
   - Value: `AIzaSyDbbVpv4fTKyQVRU6T1vOv8HyqXqQhvqYI`

---

## ✅ Step 2: Verify Deployment

Wait 30 seconds, then test:

```bash
curl -X POST \
  https://0ec90b57d6e95fcbda19832f.supabase.co/functions/v1/intelligent-chat \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Tell me about creatine"}]}'
```

**Expected response:**
```json
{
  "message": "...",
  "provider": "gemini",
  "classification": {
    "needsInternet": true,
    "reasoning": "Query about supplements, research, or current information"
  }
}
```

If you see this, **deployment succeeded!** ✅

---

## ✅ Step 3: Deploy Frontend

The frontend is already updated. Just deploy:

```bash
npm run build
# Then deploy to your hosting (Firebase, Netlify, etc.)
```

Or if auto-deployed, just push to git:
```bash
git add .
git commit -m "Add intelligent AI routing with Gemini"
git push
```

---

## ✅ Step 4: Test in Your App

Open your app and test these queries:

### Should Use GEMINI (with web search):
1. **"What's the latest research on NMN?"**
2. **"Is Turkesterone effective in 2024?"**
3. **"Compare protein powder brands"**

### Should Use OPENAI (fast response):
4. **"I ate chicken and rice"**
5. **"Best bench press form"**
6. **"How much protein do I need?"**

---

## ✅ Step 5: Verify Routing

Open **DevTools (F12)** → **Network** tab:

1. Send a test query
2. Find `intelligent-chat` request
3. Click → Preview tab
4. Check the response:

```json
{
  "provider": "gemini"  // ← Should be "gemini" for supplements
}
```

---

## ✅ Step 6: Check Logs

Go to Supabase Dashboard → Edge Functions → intelligent-chat → Logs

You should see entries like:
```
Query Classification: {
  provider: 'gemini',
  needsInternet: true,
  confidence: 0.66,
  reasoning: 'Query about supplements, research, or current information',
  query: 'Tell me about creatine'
}
```

---

## 🎉 Done!

If all steps passed, your intelligent routing is live!

---

## What You Get

✅ **Supplements**: Always use current research via Gemini
✅ **Food Logging**: Fast responses via OpenAI
✅ **Automatic**: No user action needed
✅ **Cost Efficient**: ~70% queries use cheaper OpenAI
✅ **Fallback Safe**: Gemini errors auto-fallback to OpenAI

---

## Troubleshooting

### ❌ "Function not found"
- Wait 30 seconds after deployment
- Check function name is exactly `intelligent-chat`
- Try refreshing Supabase dashboard

### ❌ "Gemini API key not configured"
```bash
# Verify secret is set
supabase secrets list

# Should show: GEMINI_API_KEY
```

### ❌ "All queries using OpenAI"
- Check Gemini API key is valid in Google Cloud Console
- Try query with strong keyword: "latest research on creatine"
- Check logs for classification reasoning

### ❌ "Gemini returning errors"
- System automatically falls back to OpenAI (no user disruption)
- Check Google Cloud Console → API quotas
- Verify "Generative Language API" is enabled

---

## Rollback (If Needed)

If anything breaks, instant rollback:

1. Edit: `src/lib/streamingChat.ts`
2. Change `intelligent-chat` → `openai-chat`
3. Redeploy frontend

Everything reverts to old behavior. No data loss.

---

## Support

📖 **Full Guide**: `INTELLIGENT_CHAT_DEPLOYMENT.md`
🧪 **Test Queries**: `TEST_INTELLIGENT_CHAT.md`
📊 **Overview**: `INTELLIGENT_CHAT_SUMMARY.md`

---

## Success Metrics (After 1 Week)

Track these in Supabase logs:

- **20-30%** queries using Gemini
- **70-80%** queries using OpenAI
- **Users getting current supplement info**
- **No increase in errors**
- **Cost increase: ~$1-2/month**

---

## Next Steps (Optional)

After successful deployment:

1. Add "Searching web..." indicator when Gemini is used
2. Display citations from Gemini responses
3. Add analytics dashboard for provider usage
4. Set up cost monitoring alerts

---

**Ready to deploy?** Start with Step 1! ⬆️
