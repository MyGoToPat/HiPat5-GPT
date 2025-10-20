// SINGLE-FILE HOTFIX (no imports). Target: restore 200 on OPTIONS/POST and verify secrets.

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, cache-control, pragma, expires, accept",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // 1) CORS preflight must never crash
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);

    // 2) Health probe to verify secrets at runtime (no external calls)
    if (url.searchParams.get("health") === "1") {
      const hasOpenAI = !!Deno.env.get("OPENAI_API_KEY");
      const hasGemini =
        !!(Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY"));
      return json({ ok: true, hasOpenAI, hasGemini });
    }

    if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

    // 3) Minimal echo to prove POST path is healthy
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // ignore
    }
    const message =
      typeof body?.message === "string" && body.message.trim()
        ? body.message.trim()
        : "ping";

    const hasOpenAI = !!Deno.env.get("OPENAI_API_KEY");
    const hasGemini =
      !!(Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY"));

    return json({
      ok: true,
      message,
      env: { hasOpenAI, hasGemini },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: msg }, 500);
  }
});