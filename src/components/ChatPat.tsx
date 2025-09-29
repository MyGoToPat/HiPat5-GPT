```diff
--- a/src/components/ChatPat.tsx
+++ b/src/components/ChatPat.tsx
@@ -13,6 +13,7 @@
   type ChatThread 
 } from '../lib/history';
 import toast from 'react-hot-toast';
+import { SYSTEM_ANY } from '../lib/personality/orchestrator'; // NEW IMPORT for shared SYSTEM_ANY
 import { getSupabase } from '../lib/supabase';
 import { useNavigate } from 'react-router-dom';
 import { useRole } from '../hooks/useRole';
@@ -140,10 +141,20 @@
             // Prepare conversation history for chat API
             const conversationHistory = [...messages, newMessage].map(msg => ({
               role: msg.isUser ? 'user' : 'assistant',
               content: msg.text
             }));
             
-            // Use new personality pipeline if available
+            // Determine if askMeAnything path is chosen
+            const { chooseTarget } = await import('../lib/personality/chooseTarget'); // Import chooseTarget
+            const { fastRoute } = await import('../lib/personality/routingTable'); // Import fastRoute
+            const fastRouteDecision = fastRoute(newMessage.text);
+            const chosenTarget = chooseTarget(fastRouteDecision.route, fastRouteDecision.target, fastRouteDecision.confidence);
+
+            let finalMessagesForCall = conversationHistory;
+            if (chosenTarget === "askMeAnything") {
+              finalMessagesForCall = [...SYSTEM_ANY, { role: "user", content: newMessage.text }];
+            }
+
             try {
               const { runPersonalityPipeline } = await import('../lib/personality/orchestrator');
               const user = await getSupabase().auth.getUser();
@@ -200,7 +211,7 @@
             console.info('Payload:', { messages: payload });
             console.info('Thread ID:', threadId);
             console.groupEnd();
-            
-            const reply = await callChat(payload);
+
+            const reply = await callChat(finalMessagesForCall); // Use finalMessagesForCall
             
             console.groupCollapsed('[chat:send] Response details');
             console.info('Status:', reply.ok ? 'Success' : 'Failed');
```