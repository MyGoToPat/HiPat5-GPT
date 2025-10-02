# Intelligent Chat Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           USER                                   │
│                     "Tell me about creatine"                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND                                    │
│                (src/lib/streamingChat.ts)                        │
│                                                                  │
│  POST /functions/v1/intelligent-chat                            │
│  { messages: [...], stream: true }                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              SUPABASE EDGE FUNCTION                             │
│         (supabase/functions/intelligent-chat)                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │          QUERY CLASSIFIER                         │          │
│  │  Analyzes: "Tell me about creatine"              │          │
│  │                                                   │          │
│  │  Keywords Found:                                 │          │
│  │  ✓ "creatine" (supplement)                       │          │
│  │  ✓ "tell me about" (research request)            │          │
│  │                                                   │          │
│  │  Decision:                                        │          │
│  │  needsInternet = true                            │          │
│  │  provider = "gemini"                             │          │
│  │  confidence = 0.66                               │          │
│  └──────────────────┬───────────────────────────────┘          │
│                     │                                            │
│        ┌────────────┴────────────┐                              │
│        ▼                         ▼                              │
│  ┌─────────────┐         ┌──────────────┐                      │
│  │   GEMINI    │         │   OPENAI     │                      │
│  │             │         │              │                      │
│  │ ✓ Selected  │         │ ✗ Skipped    │                      │
│  └─────┬───────┘         └──────────────┘                      │
│        │                                                        │
└────────┼────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GEMINI API                                    │
│            (with Google Search Enabled)                          │
│                                                                  │
│  1. Searches web for "creatine"                                 │
│  2. Finds recent research papers                                │
│  3. Finds supplement reviews                                    │
│  4. Combines results                                             │
│  5. Returns answer with Pat's personality                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      RESPONSE                                    │
│                                                                  │
│  {                                                               │
│    "message": "Creatine is one of the most researched...",     │
│    "provider": "gemini",                                        │
│    "classification": {                                           │
│      "needsInternet": true,                                     │
│      "reasoning": "Query about supplements..."                  │
│    }                                                            │
│  }                                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                           USER                                   │
│  Sees: "Creatine is one of the most researched supplements.    │
│         Recent 2024 studies show..."                            │
│                                                                  │
│  [Sources: Based on current web search]                         │
└─────────────────────────────────────────────────────────────────┘
```

## Comparison: Two Query Types

### Query Type 1: Supplements (Uses Gemini)

```
User: "What's the latest research on NMN?"
  ↓
Classifier: Keywords = ["latest", "research", "nmn"]
  ↓
Decision: needsInternet = TRUE → Use Gemini
  ↓
Gemini:
  1. Searches Google Scholar
  2. Finds 2024 studies
  3. Synthesizes with Pat's voice
  ↓
Response: "NMN research from 2024 shows... [Sources: ...]"
```

### Query Type 2: Food Logging (Uses OpenAI)

```
User: "I ate chicken breast and rice"
  ↓
Classifier: Keywords = ["i ate", "chicken breast"]
  ↓
Decision: needsInternet = FALSE → Use OpenAI
  ↓
OpenAI:
  1. Uses training data (macros database)
  2. Fast response (no web search needed)
  3. Returns with Pat's voice
  ↓
Response: "Chicken breast: 165 cal, 31g protein..."
```

## Decision Tree

```
                    User Query
                        │
                        ▼
              ┌──────────────────┐
              │  Analyze Query   │
              │    Keywords      │
              └────────┬─────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌──────────────────┐       ┌──────────────────┐
│ Contains:        │       │ Contains:        │
│ - supplement     │       │ - i ate          │
│ - research       │       │ - calories       │
│ - latest         │       │ - workout        │
│ - 2024/2025      │       │ - form           │
│ - brand          │       │ - tdee           │
│ - compare        │       │ - macros         │
└────────┬─────────┘       └────────┬─────────┘
         │                          │
         ▼                          ▼
┌──────────────────┐       ┌──────────────────┐
│  GEMINI          │       │  OPENAI          │
│  + Google Search │       │  Fast Response   │
│  ~$0.002/query   │       │  ~$0.001/query   │
└────────┬─────────┘       └────────┬─────────┘
         │                          │
         └──────────┬───────────────┘
                    ▼
              User sees answer
```

## Cost Flow (100 Queries/Day)

```
                100 Daily Queries
                       │
                       ▼
              ┌─────────────────┐
              │ Classification  │
              └────────┬─────────┘
                       │
         ┌─────────────┴──────────────┐
         │                            │
         ▼                            ▼
    70 Queries                   30 Queries
    (Static)                     (Real-time)
         │                            │
         ▼                            ▼
  ┌─────────────┐            ┌──────────────┐
  │   OPENAI    │            │    GEMINI    │
  │             │            │              │
  │ 70 × $0.001 │            │ 30 × $0.002  │
  │   = $0.07   │            │   = $0.06    │
  └─────────────┘            └──────────────┘
         │                            │
         └────────────┬───────────────┘
                      ▼
              Total: $0.13/day
              = $4/month
```

## Fallback Flow

```
User Query → Gemini Selected
                │
                ▼
         ┌──────────────┐
         │ Call Gemini  │
         └──────┬───────┘
                │
         ┌──────┴────────┐
         ▼               ▼
    ┌─────────┐     ┌─────────────┐
    │ Success │     │   Error     │
    └────┬────┘     │ (quota/API) │
         │          └──────┬──────┘
         │                 │
         │                 ▼
         │          ┌──────────────┐
         │          │ Log Warning  │
         │          └──────┬───────┘
         │                 │
         │                 ▼
         │          ┌──────────────┐
         │          │ Fallback to  │
         │          │   OpenAI     │
         │          └──────┬───────┘
         │                 │
         └─────────┬───────┘
                   ▼
            User Sees Answer
          (No error visible)
```

## Data Flow: Streaming Mode

```
User sends message
  ↓
Frontend: POST to intelligent-chat (stream: true)
  ↓
Edge Function: Classify query
  ↓
Route to OpenAI (Gemini doesn't stream yet)
  ↓
OpenAI: Stream tokens back
  ↓
Edge Function: Forward tokens
  ↓
Frontend: Display tokens in real-time
  ↓
User sees typing animation

Token 1: "Creatine"
Token 2: " is"
Token 3: " one"
Token 4: " of"
...
```

## Provider Comparison

```
┌──────────────────┬──────────────────┬──────────────────┐
│   Feature        │     GEMINI       │     OPENAI       │
├──────────────────┼──────────────────┼──────────────────┤
│ Internet Access  │ ✓ Yes (Google)   │ ✗ No             │
│ Knowledge Cutoff │ Real-time        │ Oct 2023         │
│ Cost per Query   │ ~$0.002          │ ~$0.001          │
│ Speed            │ Slower (search)  │ Faster           │
│ Citations        │ ✓ Yes            │ ✗ No             │
│ Streaming        │ ✗ Not yet        │ ✓ Yes            │
│ Best For         │ Research         │ Static data      │
│                  │ Supplements      │ Food logging     │
│                  │ Current info     │ Exercise basics  │
└──────────────────┴──────────────────┴──────────────────┘
```

## Query Examples by Provider

### GEMINI (Internet Required)
```
✓ "What's the latest research on creatine?"
✓ "Is NMN worth it in 2024?"
✓ "Compare protein powder brands"
✓ "New findings about sleep and recovery"
✓ "Current consensus on keto diet"
✓ "Turkesterone effectiveness studies"
✓ "Best pre-workout supplements 2024"
```

### OPENAI (Static Knowledge)
```
✓ "I ate chicken breast and rice"
✓ "Macros in 4 oz salmon"
✓ "Best bench press form"
✓ "How does protein synthesis work?"
✓ "What is TDEE?"
✓ "Ideal rep range for hypertrophy"
✓ "Difference between cutting and bulking"
```

## Monitoring Dashboard (Conceptual)

```
┌─────────────────────────────────────────────────┐
│         Intelligent Chat Analytics              │
├─────────────────────────────────────────────────┤
│                                                 │
│  Today's Queries: 156                           │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐           │
│  │   OPENAI     │  │   GEMINI     │           │
│  │   108 (69%)  │  │   48 (31%)   │           │
│  │   Cost: $0.11│  │   Cost: $0.10│           │
│  └──────────────┘  └──────────────┘           │
│                                                 │
│  Total Cost Today: $0.21                        │
│  Projected Monthly: $6.30                       │
│                                                 │
│  Top Keywords Triggering Gemini:                │
│  1. "research" (12 queries)                     │
│  2. "supplement" (10 queries)                   │
│  3. "latest" (8 queries)                        │
│                                                 │
│  Fallback Events: 2                             │
│  (Gemini errors → OpenAI fallback)              │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Implementation Status

```
✓ Query classifier built
✓ Gemini API integration complete
✓ OpenAI integration preserved
✓ Streaming support maintained
✓ Fallback handling implemented
✓ Frontend updated
✓ Logging & monitoring ready
✓ Documentation complete
✓ Build passes

⏳ Awaiting deployment:
  - Deploy edge function
  - Set Gemini API key
  - Test in production
```

## Success Flow

```
1. Deploy Function
   ↓
2. Set API Key
   ↓
3. Test Supplement Query → Routes to Gemini ✓
   ↓
4. Test Food Query → Routes to OpenAI ✓
   ↓
5. Check Logs → See classifications ✓
   ↓
6. Monitor Usage → Track costs ✓
   ↓
7. User gets current supplement info ✓
   ↓
🎉 SUCCESS
```
