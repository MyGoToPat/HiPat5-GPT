```diff
--- a/src/lib/personality/routingTable.ts
+++ b/src/lib/personality/routingTable.ts
@@ -40,6 +40,7 @@
     'tell-me-what-you-ate': 'tmwya',
     'tell-me-about-your-workout': 'workout',
     'make-me-better': 'mmb',
-    'askMeAnything': 'askMeAnything'
+    'askMeAnything': 'askMeAnything', // NEW MAPPING
   };
   return mapping[slug] || slug;
 }
```