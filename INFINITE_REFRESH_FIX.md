# Infinite Refresh Loop Fix

**Date:** 2025-10-16
**Issue:** Application stuck in infinite refresh loop every ~8 seconds
**Status:** ✅ Fixed

## Root Cause

Two React useEffect hooks with problematic dependencies:

### 1. TDEEGuard - Location Pathname Dependency
**File:** `src/components/auth/TDEEGuard.tsx` (Line 68)

**Before:** `useEffect(() => {...}, [location.pathname]);`
**After:** `useEffect(() => {...}, []);`

The guard was re-checking TDEE status on every path change, causing cascading re-renders.

### 2. DashboardPage - Navigate Loop
**File:** `src/components/DashboardPage.tsx` (Lines 77, 81)

**Before:** 
- `navigate(location.pathname, { replace: true, state: {} });`
- Dependencies: `[location.state, navigate, location.pathname]`

**After:**
- `window.history.replaceState({}, document.title);`
- Dependencies: `[location.state]`

Using `navigate()` inside an effect that depends on navigation state created an infinite loop.

## Files Modified

1. `src/components/auth/TDEEGuard.tsx` - Removed location.pathname dependency
2. `src/components/DashboardPage.tsx` - Replaced navigate() with native history API

## Verification

✅ TypeScript compiles without errors
✅ No infinite refresh loops
✅ App loads once and stays stable

## Status

**Fixed and ready for next development phase**
