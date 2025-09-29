```diff
--- a/src/lib/personality/orchestrator.ts
+++ b/src/lib/personality/orchestrator.ts
@@ -2,7 +2,7 @@
 
 import { AgentConfig } from "@/types/mcp";
 import { renderTemplate } from "@/lib/personality/template";
-import { getPersonalityAgents, getPersonalitySwarm, getRouterV1Enabled } from "@/state/personalityStore";
+import { getPersonalityAgents, getRouterV1Enabled } from "@/state/personalityStore";
 import { fastRoute, type RouteHit, resolveRoleTarget } from "./routingTable";
 import { checkPermissionsForTarget, getPermissionDeniedMessage } from "./permissions";
 import { invokeEdgeFunction, fetchFoodMacros } from "./tools";
@@ -10,6 +10,7 @@
 import { getSupabase } from "@/lib/supabase";
 import type { UserProfile } from "@/types/user";
 import { callFoodMacros } from './tools';
+import { ALLOWED_TARGETS, chooseTarget } from "./chooseTarget"; // NEW IMPORT
 
 // Guardrail constants
 const MAX_TURN_MS = 5000; // Overall per-turn budget
@@ -50,6 +51,15 @@
   };
 };
 
+const SYSTEM_ANY = [ // NEW CONSTANT
+  {
+    role: "system",
+    content:
+      "You are Pat. Answer helpfully and precisely on any topic. Be concise and actionable. When a specialized role would add value, suggest it in one sentence at the end."
+  }
+];
+
+
 // Helper to run a single agent
 async function runAgent(
   agentId: string,
@@ -130,10 +140,8 @@
 
   if (roleTarget === "askMeAnything") {
     // General conversation mode - minimal token usage
-    const generalSystemPrompt = "You are Pat, a knowledgeable assistant. Be helpful, concise, and accurate. Use first person perspective.";
-    
     const generalChatResult = await callChat([
-      { role: "system", content: generalSystemPrompt },
+      ...SYSTEM_ANY, // Use the shared SYSTEM_ANY
       { role: "user", content: userMessage }
     ], {
       model: "gpt-4o-mini",
@@ -199,23 +207,13 @@
     }
     debug.routerDecision = decision;
 
-    const ALLOWED_TARGETS = new Set([
-      "tmwya",
-      "workout", 
-      "mmb",
-      "openai-food-macros",
-      "askMeAnything"
-    ]);
-
-    function chooseTarget(route?: string, target?: string, confidence?: number) {
-      let chosen = target;
-      if (
-        !chosen ||
-        !ALLOWED_TARGETS.has(chosen) ||
-        (typeof confidence === "number" && confidence < 0.5) ||
-        route === "none"
-      ) {
-        chosen = "askMeAnything";
-      }
-      console.debug("[Pat Router]", { route, target, confidence, chosen });
-      return chosen;
-    }
-
-    const chosenTarget = chooseTarget(decision.route, decision.target, decision.confidence);
+    // Use the shared chooseTarget function
+    const chosenTarget = chooseTarget(
+      decision.route,
+      decision.target,
+      decision.confidence
+    );
+    console.debug("[Pat Router]", { route: decision.route, target: decision.target, conf: decision.confidence, chosen: chosenTarget });
     debug.routerDecision = { ...decision, target: chosenTarget, route: "role" };
 
     // 4. Permission Check (if delegating)
```