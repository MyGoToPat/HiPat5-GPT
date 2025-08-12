```diff
--- a/src/components/profile/ProgressVisualizations.tsx
+++ b/src/components/profile/ProgressVisualizations.tsx
@@ -89,7 +89,7 @@
       <div className="bg-gray-800 rounded-lg p-4">
         <h4 className="text-white font-medium mb-4">Monthly Consistency Score</h4>
         <div className="flex items-end justify-between h-24 gap-2">
-          {monthlyTrends.map((week, index) => (
+          {monthlyTrends.map((week) => ( // eslint-disable-next-line react/jsx-key
             <div key={week.week} className="flex-1 flex flex-col items-center">
               <div 
                 className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm transition-all duration-500 hover:from-blue-500 hover:to-blue-300"
```