/**
 * AMA Web Research Edge Function
 * Google Custom Search + Gemini synthesis for web-enabled AMA queries
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface RequestBody {
  query: string;
  recencyDays?: number;
  maxResults?: number;
  detail?: 'brief' | 'detailed';
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: RequestBody = await req.json();
    const { query, recencyDays = 365, maxResults = 6, detail = 'brief' } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid query' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API keys from environment
    const CSE_KEY = Deno.env.get('GOOGLE_API_KEY');
    const CSE_CX = Deno.env.get('GOOGLE_CSE_ID');
    const GEM_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!CSE_KEY || !CSE_CX || !GEM_KEY) {
      console.error('[ama-web] Missing required secrets:', {
        hasCSEKey: !!CSE_KEY,
        hasCSECX: !!CSE_CX,
        hasGeminiKey: !!GEM_KEY
      });
      return new Response(
        JSON.stringify({ error: 'Missing API keys' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ama-web] Processing query: "${query}" (recency: ${recencyDays}d, maxResults: ${maxResults}, detail: ${detail})`);

    // Step 1: Google Custom Search
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${CSE_KEY}&cx=${CSE_CX}` +
      `&q=${encodeURIComponent(query)}&num=${Math.min(maxResults, 10)}&dateRestrict=d${recencyDays}`;

    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('[ama-web] Google CSE error:', searchResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Google search failed: ${searchResponse.status}` }),
        { status: searchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchJson = await searchResponse.json();
    const items = (searchJson.items ?? []).map((it: any) => ({
      title: it.title,
      url: it.link,
      snippet: it.snippet
    }));

    if (items.length === 0) {
      console.warn('[ama-web] No search results found');
      return new Response(
        JSON.stringify({
          answerText: `I couldn't find recent information about "${query}". Try rephrasing or checking if the topic exists.`,
          citations: [],
          sources: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ama-web] Found ${items.length} search results`);

    // Step 2: Synthesize with Gemini
    const context = items
      .map((it, i) => `[${i + 1}] ${it.title}\n${it.url}\n${it.snippet}`)
      .join("\n\n");

    const geminiPrompt = `You are Pat, a helpful AI assistant. Synthesize the latest information to answer: "${query}".

Use only the context below. Cite sources inline as [1], [2], etc. Then list the links at the end under "Sources:".

Context:
${context}

Provide a clear, concise answer in Pat's first-person, spartan tone.`;

    const geminiBody = {
      contents: [{
        role: "user",
        parts: [{ text: geminiPrompt }]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: detail === 'detailed' ? 1200 : 600,
        topP: 0.95,
      }
    };

    // ✅ Dynamic model selection: detailed → pro, brief → flash
    const modelForDetail = detail === 'detailed' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelForDetail}:generateContent?key=${GEM_KEY}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody)
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('[ama-web] Gemini API error:', geminiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Gemini synthesis failed: ${geminiResponse.status}` }),
        { status: geminiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiJson = await geminiResponse.json();
    const answerText = geminiJson?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p.text)
      .join("") ?? "I couldn't generate a summary. Please try again.";

    console.log(`[ama-web] Generated answer (${answerText.length} chars)`);

    return new Response(
      JSON.stringify({
        answerText,
        citations: items,
        sources: items.map((it, i) => `[${i + 1}] ${it.url}`).join('\n')
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[ama-web] Exception:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Web search failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

