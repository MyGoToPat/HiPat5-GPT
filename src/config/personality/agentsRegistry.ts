```diff
--- a/src/config/personality/agentsRegistry.ts
+++ b/src/config/personality/agentsRegistry.ts
@@ -14,7 +14,7 @@
   enabledForFreeTrial: true, // Router itself should be universally available
   instructions:
     "Analyze the user's query with precision to determine the optimal processing path. Classify intent and delegate to the most appropriate specialized module or tool. Output a strictly validated JSON object detailing the routing decision, confidence level, and any extracted parameters. Maintain an objective, analytical tone.",
-  promptTemplate:
-    "Analyze the following user directive:\n\n\"\"\"{{user_message}}\"\"\"\n\nDetermine the optimal 'route' (pat|role|tool|none) and, if applicable, the 'target' module. Valid targets: [\"tmwya\",\"workout\",\"mmb\",\"openai-food-macros\",\"askMeAnything\"]. If the user's message does not clearly map to a specialized target with high confidence, set target = \"askMeAnything\". Extract any pertinent 'params' for the target. Provide a 'confidence' score (0.0-1.0) for this classification and a brief 'reason'. Ensure the output adheres strictly to the specified JSON schema.",
+  promptTemplate: // UPDATED PROMPT TEMPLATE
+    "Analyze the following user directive:\n\n\"\"\"{{user_message}}\"\"\"\n\nDetermine the optimal 'route' (pat|role|tool|none) and, if applicable, the 'target' module. Valid targets: [\"tmwya\",\"workout\",\"mmb\",\"openai-food-macros\",\"askMeAnything\"]. If the user's message does not clearly map to a specialized target with high confidence, set target = \"askMeAnything\". Extract any pertinent 'params' for the target. Provide a 'confidence' score (0.0-1.0) for this classification and a brief 'reason'. Ensure the output adheres strictly to the specified JSON schema.",
   tone: { preset: "neutral", notes: "Objective, analytical classification only" },
   api: {
     provider: "openai",
```