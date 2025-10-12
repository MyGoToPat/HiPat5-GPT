import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Step } from "./types.ts";

// Static registry maps DB slugs → dynamic module import.
// Each module exports `step` (named) and default; we accept either.
const registry: Record<string, () => Promise<{ default?: Step; step?: Step }>> = {
  "empathy-detector":        () => import("./modules/empathy-detector.ts"),
  "learning-profiler":       () => import("./modules/learning-profiler.ts"),
  "privacy-redaction":       () => import("./modules/privacy-redaction.ts"),
  "evidence-gate":           () => import("./modules/evidence-gate.ts"),
  "clarity-coach":           () => import("./modules/clarity-coach.ts"),
  "conciseness-enforcer":    () => import("./modules/conciseness-enforcer.ts"),
  "uncertainty-calibrator":  () => import("./modules/uncertainty-calibrator.ts"),
  "persona-consistency":     () => import("./modules/persona-consistency.ts"),
  "time-context":            () => import("./modules/time-context.ts"),
  "accessibility-formatter": () => import("./modules/accessibility-formatter.ts"),
  "audience-switcher":       () => import("./modules/audience-switcher.ts"),
  "actionizer":              () => import("./modules/actionizer.ts"),
};

type AgentRow = { slug: string; enabled: boolean; order: number };

export type LoadResult = {
  steps: Step[];
  plan: AgentRow[];
  notes: string[]; // missing/bad module breadcrumbs
};

/**
 * Load enabled personality steps in DB order.
 * - Queries public.agents (category='personality', enabled=true).
 * - Maps each slug to its module and collects ordered Step[].
 * - Returns steps + plan + notes (missing/bad module traces).
 */
export async function loadPersonalitySwarm(
  supabase: SupabaseClient
): Promise<LoadResult> {
  const notes: string[] = [];

  const { data, error } = await supabase
    .from("agents")
    .select('slug, enabled, "order"')
    .eq("category", "personality")
    .eq("enabled", true)
    .order("order", { ascending: true }) as unknown as {
      data: AgentRow[] | null;
      error: any;
    };

  if (error) {
    notes.push(`db_error:${String(error?.message ?? error)}`);
    return { steps: [], plan: [], notes };
  }

  const plan = (data ?? []).filter(Boolean);
  const steps: Step[] = [];

  for (const row of plan) {
    const loader = registry[row.slug];
    if (!loader) {
      notes.push(`missing_module:${row.slug}`);
      continue;
    }
    try {
      const mod = await loader();
      const step = mod.step ?? mod.default;
      if (!step) {
        notes.push(`bad_module_export:${row.slug}`);
        continue;
      }
      steps.push(step);
    } catch (e) {
      notes.push(`import_fail:${row.slug}:${String((e as Error)?.message ?? e)}`);
    }
  }

  return { steps, plan, notes };
}