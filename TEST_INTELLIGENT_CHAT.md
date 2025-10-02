# Testing the Intelligent Chat System

## Quick Test Guide

After deploying the `intelligent-chat` edge function, use these test queries to verify routing works correctly.

## Test Queries - Should Use GEMINI (with Google Search)

These queries need real-time internet access and should route to Gemini:

### Supplements & Research
```
1. "What's the latest research on NMN supplements?"
   Expected: Recent studies, publication dates, citations

2. "Is Turkesterone effective in 2024?"
   Expected: Current reviews, recent research, efficacy data

3. "Tell me about creatine"
   Expected: Basic info + recent studies and updates

4. "Compare whey protein brands"
   Expected: Product comparisons with current market data

5. "What does the research say about ashwagandha?"
   Expected: Recent clinical trials and studies

6. "Best pre-workout supplements 2024"
   Expected: Current products and reviews

7. "Is NMN worth the cost?"
   Expected: Recent research, cost-benefit analysis
```

### Current Information
```
8. "Latest research on intermittent fasting"
   Expected: Recent studies from 2024

9. "New findings about sleep and recovery"
   Expected: Current research articles

10. "What's the current consensus on keto diet?"
    Expected: Up-to-date medical consensus
```

## Test Queries - Should Use OPENAI (Static Knowledge)

These queries don't need internet access and should route to OpenAI:

### Food & Macros
```
1. "I ate chicken breast and rice"
   Expected: Macro breakdown, nutritional analysis

2. "How many calories in a Big Mac?"
   Expected: Calorie count and macro split

3. "What are good protein sources?"
   Expected: List of protein-rich foods

4. "Macros for 4 oz salmon"
   Expected: Protein, fat, carbs breakdown
```

### Exercise & Form
```
5. "Best bench press form"
   Expected: Technique guidance, biomechanics

6. "How to progressive overload?"
   Expected: Training principles

7. "What's the difference between squat variations?"
   Expected: Exercise comparison, muscle targeting

8. "Ideal rep range for hypertrophy"
   Expected: Training science (8-12 reps, etc.)
```

### Physiology & Science
```
9. "Explain protein synthesis"
   Expected: Biochemistry explanation

10. "How does muscle growth work?"
    Expected: Physiological process

11. "What is TDEE?"
    Expected: Definition and calculation

12. "Difference between cutting and bulking"
    Expected: Training phases explained
```

## How to Verify Routing

### Method 1: Check Response Content

**Gemini responses** should include:
- References to recent dates (2024, 2025)
- Web sources or citations
- "Based on current web search" footer
- More specific brand/product names

**OpenAI responses** should be:
- Concise and direct
- Based on established knowledge
- No specific dates beyond training cutoff
- General principles and science

### Method 2: Check Browser DevTools

1. Open browser DevTools (F12)
2. Go to Network tab
3. Send a test query
4. Find the `intelligent-chat` request
5. Check the response JSON:

```json
{
  "message": "...",
  "usage": {...},
  "provider": "gemini",  // <-- This shows which AI was used
  "classification": {
    "needsInternet": true,
    "confidence": 0.66,
    "reasoning": "Query about supplements, research, or current information",
    "provider": "gemini"
  }
}
```

### Method 3: Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to: Edge Functions → intelligent-chat → Logs
3. Look for log entries like:

```
Query Classification: {
  provider: 'gemini',
  needsInternet: true,
  confidence: 0.66,
  reasoning: 'Query about supplements, research, or current information',
  query: 'Tell me about creatine'
}
```

## Expected Routing Breakdown

For a typical user session, expect:

- **70-80% OpenAI**: Food logging, exercise questions, general fitness
- **20-30% Gemini**: Supplement research, current studies, product comparisons

This keeps costs low while providing accurate current information when needed.

## Cost Tracking

Monitor your API costs:

**OpenAI (GPT-4o-mini):**
- Input: $0.150 per 1M tokens
- Output: $0.600 per 1M tokens
- Typical query: ~$0.001

**Gemini (1.5 Flash with Search):**
- Input: $0.075 per 1M tokens (cheaper!)
- Output: $0.300 per 1M tokens (cheaper!)
- With search: ~$0.002 per query

**Expected Daily Costs** (100 queries/day):
- Without intelligent routing: $0.10/day (all OpenAI)
- With intelligent routing: $0.08/day (mixed, but Gemini gives better value)

## Troubleshooting

### All queries going to OpenAI

**Possible causes:**
1. Gemini API key not set
2. Gemini API key invalid
3. Keywords not matching classification rules

**Fix:**
- Check `supabase secrets list`
- Verify Gemini key: `AIzaSyDbbVpv4fTKyQVRU6T1vOv8HyqXqQhvqYI`
- Test with strong keywords like "latest research on creatine"

### Gemini returning errors

**Possible causes:**
1. API quota exceeded
2. Google Search not enabled
3. Invalid API key

**Fix:**
- Check Google Cloud Console quota
- Verify API key has "Generative Language API" enabled
- System will auto-fallback to OpenAI (no user disruption)

### Response seems outdated even with Gemini

**Possible causes:**
1. Google Search didn't trigger
2. Query classification sent to OpenAI instead

**Fix:**
- Check response JSON for `"provider": "gemini"`
- Check logs for classification reasoning
- Try adding "2024" or "latest" to your query

## Success Criteria

✅ Supplement queries return recent studies and dates
✅ Food logging queries get quick macro responses
✅ Response JSON shows correct provider
✅ Logs show classification decisions
✅ No errors in Supabase function logs
✅ Build completes without errors

## Next Steps After Testing

Once routing works correctly:

1. **Add UI Indicator**: Show "Searching web..." badge when Gemini is used
2. **Display Citations**: Show sources when Gemini returns research links
3. **Analytics**: Track provider usage and costs
4. **User Control**: Add "search:" prefix to force Gemini routing
5. **Fine-tune Classification**: Adjust keywords based on real usage patterns

## Test Script (Copy & Paste)

Use these queries in your chat interface:

```
# Should use GEMINI:
1. What's the latest research on NMN?
2. Is creatine safe in 2024?
3. Compare protein powder brands

# Should use OPENAI:
4. I ate chicken and rice
5. Best bench press form
6. How much protein do I need?

# Verify in DevTools → Network → Response JSON
```

Look for `"provider": "gemini"` vs `"provider": "openai"` in the response.
