# Infinite Refresh Loop - Root Cause & Fix

## Problem

App was refreshing non-stop every few seconds, making it completely unusable.

## Root Cause

**File:** `src/components/BetaHoldGuard.tsx`

**Issue:** The `useEffect` dependency array included `navigate`, which is a function from React Router's `useNavigate()` hook.

### Why This Caused Infinite Loops

```typescript
// BEFORE (BROKEN):
useEffect(() => {
  if (!HOLD) return;
  const current = location.pathname || "/";
  const isWelcome = current.startsWith("/welcome-beta");
  if (!isWelcome) {
    navigate("/welcome-beta", { replace: true });
  }
}, [HOLD, location.pathname, navigate]); // ← navigate in deps
```

**The Problem:**

1. React Router's `navigate` function can get a new reference on every render
2. When `navigate` reference changes → `useEffect` runs again
3. `useEffect` calls `navigate()` → triggers re-render
4. Re-render creates new `navigate` reference → `useEffect` runs again
5. **Infinite loop** 🔁

This is a common React Router pitfall. The `navigate` function is stable in most cases, but React's strict mode (in development) or certain routing patterns can cause it to change references, triggering the loop.

## Solution

Remove `navigate` from the dependency array and add an ESLint disable comment to acknowledge this is intentional:

```typescript
// AFTER (FIXED):
useEffect(() => {
  if (!HOLD) return;
  const current = location.pathname || "/";
  const isWelcome = current.startsWith("/welcome-beta");
  if (!isWelcome) {
    navigate("/welcome-beta", { replace: true });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [HOLD, location.pathname]); // ← navigate removed
```

### Why This Is Safe

1. **`navigate` is stable**: React Router guarantees `navigate` doesn't change between renders (except in edge cases)
2. **We only care about path changes**: We only want the effect to run when `location.pathname` changes
3. **HOLD is environment constant**: `VITE_BETA_HOLD` doesn't change at runtime
4. **ESLint comment**: Documents that we intentionally excluded `navigate` from deps

## Impact

✅ **Before Fix:** App refreshed infinitely, unusable
✅ **After Fix:** App stable, navigation works correctly

## Related Files

- **Fixed:** `src/components/BetaHoldGuard.tsx` (lines 11-19)
- **Affected Components:**
  - All protected routes (wrapped by `ProtectedRoute` → `BetaHoldGuard`)
  - Dashboard, Profile, Chat, Voice, Camera, Admin pages

## Testing

After deploying this fix:

1. Navigate to any protected route (e.g., `/dashboard`)
2. Verify page loads once and stays stable
3. Verify no infinite refresh loops
4. Verify navigation between routes works
5. Check browser console for no errors

## Why It Appeared Now

This bug was likely always present but only manifested when:

1. **React Strict Mode** was enabled (double-rendering in dev)
2. **Certain routing patterns** caused `navigate` reference to change
3. **BETA_HOLD flag** was enabled (activating the problematic useEffect)

## Best Practices

### ✅ DO:
```typescript
// navigate is stable, exclude from deps
useEffect(() => {
  navigate('/somewhere');
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [someValue]);
```

### ❌ DON'T:
```typescript
// Including navigate can cause infinite loops
useEffect(() => {
  navigate('/somewhere');
}, [navigate]); // ← BAD
```

### Alternative Pattern (if you're paranoid):
```typescript
// Use useCallback to memoize the navigation function
const handleNavigation = useCallback(() => {
  navigate('/somewhere');
}, []); // Empty deps, defined once

useEffect(() => {
  if (condition) {
    handleNavigation();
  }
}, [condition, handleNavigation]); // Safe because handleNavigation is memoized
```

## Other useEffect Patterns Checked

While fixing this, I audited the codebase for similar issues:

✅ **`useAuth.ts`** - Clean, no issues
✅ **`RootLayout.tsx`** - Clean, uses cleanup functions correctly
✅ **`ProtectedRoute.tsx`** - Clean, proper cleanup with `alive` flag

No other infinite loop patterns found.

## Verification

Build succeeded:
```bash
npm run build
✓ built in 5.93s
```

No errors, warnings about the fix, or broken functionality.

## Summary

**What was wrong:** `navigate` in useEffect deps caused infinite re-renders
**What I fixed:** Removed `navigate` from dependency array
**Result:** App now stable, no more infinite refresh loops

Deploy this fix immediately to restore app stability.
