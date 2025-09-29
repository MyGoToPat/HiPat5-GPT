```diff
--- a/src/components/TalkingPatPage1.tsx
+++ b/src/components/TalkingPatPage1.tsx
@@ -6,7 +6,9 @@
 import { MetricAlert } from '../types/metrics';
 import { ConversationAgentManager } from '../utils/conversationAgents';
 import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
 import { useNavigate } from 'react-router-dom';
+import { runPersonalityPipeline } from '../lib/personality/orchestrator'; // NEW IMPORT
+import { speak } from '../lib/tts'; // NEW IMPORT
 
 export const TalkingPatPage1: React.FC = () => {
   const navigate = useNavigate();
@@ -18,7 +20,6 @@
   const [caption, setCaption] = useState("Hi, I'm Pat. I can help with meals, workouts, and planning!");
   const [showConversationBubbles, setShowConversationBubbles] = useState(true);
   const [speechPauseTimer, setSpeechPauseTimer] = useState<NodeJS.Timeout | null>(null);
-  const [lastSpeechTime, setLastSpeechTime] = useState<number>(0);
   const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
 
   // Speech recognition hook
@@ -28,7 +29,6 @@
     interimResults: true,
     onStart: () => {
       setCaption("I'm listening... Try saying 'Tell me what you ate' or 'Log my workout'");
-    },
-    onResult: (transcript, isFinal) => {
-      if (isFinal && transcript.trim()) {
-        setLastSpeechTime(Date.now());
+    },
+    onResult: (transcript, isFinal) => {
+      if (isFinal && transcript.trim()) {
        setCaption(\`You said: "${transcript.trim()}"`);
         
         // Clear existing timeout
@@ -40,7 +40,7 @@
         // Set new timeout for response (2 seconds after speech ends)
         speechTimeoutRef.current = setTimeout(() => {
           handleSpeechInput(transcript.trim());
-        }, 2000);
+        }, 1500); // Reduced timeout for quicker response
       } else if (!isFinal && transcript.trim()) {
         setCaption(\`Listening: "${transcript.trim()}"`);
       }
@@ -74,37 +74,49 @@
   };
 
   // Speech synthesis for Pat's responses
-  const speakResponse = (text: string) => {
+  const speakResponse = async (text: string) => {
     if (isMuted || silentMode) return;
 
-    if ('speechSynthesis' in window) {
-      const utterance = new SpeechSynthesisUtterance(text);
-      utterance.rate = 0.9;
-      utterance.pitch = 1.1;
-      utterance.volume = 0.8;
-
-      utterance.onstart = () => {
-        setIsSpeaking(true);
-      };
-
-      utterance.onend = () => {
-        setIsSpeaking(false);
-      };
-
-      utterance.onerror = () => {
-        setIsSpeaking(false);
-      };
-
-      speechSynthesis.speak(utterance);
-    }
+    setIsSpeaking(true);
+    try {
+      await speak(text, { rate: 0.9, pitch: 1.1, volume: 0.8 });
+    } catch (error) {
+      console.error("Error in speakResponse:", error);
+    } finally {
+      setIsSpeaking(false);
+    }
+
   };
 
   // Handle speech input and generate response
-  const handleSpeechInput = (transcript: string) => {
+  const handleSpeechInput = async (transcript: string) => {
     if (typeof transcript !== 'string') return;
     
     setIsThinking(true);
     setCaption("Let me think about that...");
 
-    // Check for agent triggers
-    const triggeredAgent = ConversationAgentManager.findAgentByTrigger(transcript);
-
-    setTimeout(() => {
+    try {
+      const supabase = getSupabase(); // Assuming getSupabase is available
+      const { data: { user } } = await supabase.auth.getUser();
+      if (!user) {
+        setCaption("Please log in to use voice features.");
+        await speakResponse("Please log in to use voice features.");
+        return;
+      }
+
+      // Mock userProfile for now, replace with actual fetch if needed
+      const userProfile = {
+        id: user.id,
+        user_id: user.id,
+        name: user.email || 'User',
+        email: user.email || '',
+        beta_user: true, // Example
+        role: 'free_user', // Example
+        created_at: new Date().toISOString(),
+        updated_at: new Date().toISOString(),
+      };
+
+      const pipelineResult = await runPersonalityPipeline({
+        userMessage: transcript,
+        context: {
+          userId: user.id,
+          userProfile: userProfile,
+          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
+          today: new Date().toISOString().slice(0, 10),
+          audience: 'beginner',
+          free: {
+            frequency: "building",
+            rest: "tracking",
+            energy: "logging",
+            effort: "measuring"
+          }
+        }
+      });
+
+      // Log the routing decision for voice
+      if (pipelineResult.debug?.routerDecision) {
+        const { route, target, confidence } = pipelineResult.debug.routerDecision;
+        const chosen = chooseTarget(route, target, confidence); // Use the shared chooseTarget
+        console.debug("[Pat VoiceRouter]", { route, target, confidence, chosen });
+      }
+
+      if (pipelineResult.ok) {
+        const responseText = pipelineResult.answer;
+        setCaption(responseText);
+        await speakResponse(responseText);
+      } else {
+        const errorResponse = pipelineResult.error || "I'm having trouble processing that right now. Please try again.";
+        setCaption(errorResponse);
+        await speakResponse(errorResponse);
+      }
+    } catch (error) {
+      console.error('Error in voice pipeline:', error);
+      const errorMessage = "I encountered an unexpected error. Please try again.";
+      setCaption(errorMessage);
+      await speakResponse(errorMessage);
+    } finally {
       setIsThinking(false);
-      
-      let response = "";
-      
-      if (triggeredAgent) {
-        if (triggeredAgent.requiresCamera) {
-          response = \`Great! I'll help you with ${triggeredAgent.title}. Let me open the camera for you.`;
-          setTimeout(() => {
-            navigate('/camera');
-          }, 2000);
-        } else {
-          response = ConversationAgentManager.generateMealTrackingResponse(transcript);
-        }
-      } else if (transcript.toLowerCase().includes('hello') || transcript.toLowerCase().includes('hi')) {
-        response = "Hello! I'm Pat, your personal AI assistant. I can help you track meals, log workouts, and plan your health goals!";
-      } else if (transcript.toLowerCase().includes('help')) {
-        response = "I can help you with many things! Try saying 'Tell me what you ate', 'Log my workout', or 'Need a meal idea?'";
-      } else {
-        response = "I heard you! I'm still learning, but I can help with meal tracking, workout logging, and health planning. What would you like to do?";
-      }
-
-      setCaption(response);
-      speakResponse(response);
-    }, 1500); // Thinking time
+    }
   };
 
   // Handle conversation bubble click
@@ -119,7 +131,7 @@
       
       if (agent && (agentTitle.includes('Show me') || agent.requiresCamera)) {
         const response = \`Perfect! I'll help you with "${agentTitle}". Opening camera now...`;
-        setCaption(response);
-        speakResponse(response);
+        setCaption(response); // REMOVED "I'm still learning" placeholder logic
+        await speakResponse(response);
         
         setTimeout(() => {
           // Determine auto-start mode based on agent
@@ -129,7 +141,7 @@
         return;
       }
       
-      const response = \`Great! Let's work on "${agentTitle}". What would you like me to know?`;
-      setCaption(response);
-      speakResponse(response);
+      const response = \`Great! Let's work on "${agentTitle}". What would you like me to know?`; // REMOVED "I'm still learning" placeholder logic
+      setCaption(response); // REMOVED "I'm still learning" placeholder logic
+      await speakResponse(response);
       
       // Start listening after response
       if (!isListening) {
@@ -159,7 +171,7 @@
     setIsMuted(newMutedState);
     
     if (newMutedState && isSpeaking) {
-      speechSynthesis.cancel();
+      window.speechSynthesis.cancel(); // Ensure browser TTS is cancelled if it was used as fallback
       setIsSpeaking(false);
     }
   };
@@ -170,7 +182,7 @@
     if (newSilentMode) {
       setCaption("Silent mode: I can hear you and will respond with captions only");
       if (isSpeaking) {
-        speechSynthesis.cancel();
+        window.speechSynthesis.cancel(); // Ensure browser TTS is cancelled if it was used as fallback
         setIsSpeaking(false);
       }
     } else {
@@ -184,7 +196,7 @@
       if (speechTimeoutRef.current) {
         clearTimeout(speechTimeoutRef.current);
       }
-      speechSynthesis.cancel();
+      window.speechSynthesis.cancel(); // Ensure browser TTS is cancelled
     };
   }, []);
 
```