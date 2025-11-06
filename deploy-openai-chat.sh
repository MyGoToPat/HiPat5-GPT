#!/usr/bin/env bash
#
# Unified deploy script for Supabase Edge Functions
# - Default: deploys openai-chat (with CORS fixes)
# - Optional: pass function name as 1st arg, e.g. "nutrition-gemini"
#
# Usage:
#   ./deploy-openai-chat.sh
#   ./deploy-openai-chat.sh nutrition-gemini
#   SUPABASE_PROJECT_REF=yourref ./deploy-openai-chat.sh openai-chat
#

set -euo pipefail
trap 'echo ""; echo "❌ Deployment failed (exit $?). Check messages above."; exit 1' ERR

# --- Setup --------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PROJECT_REF="${SUPABASE_PROJECT_REF:-jdtogitfqptdrxkczdbw}"
FUNCTION_NAME="${1:-openai-chat}"

echo "Supabase project: ${PROJECT_REF}"
echo "Function to deploy: ${FUNCTION_NAME}"
echo ""

# --- Checks -------------------------------------------------------------------

# Supabase CLI present?
if ! command -v supabase >/dev/null 2>&1; then
  echo "ERROR: Supabase CLI not found."
  echo "Install: https://supabase.com/docs/guides/cli"
  exit 1
fi

# Ensure we’re logged in (projects list fails when unauthenticated)
if ! supabase projects list >/dev/null 2>&1; then
  echo "Supabase CLI not authenticated. Opening browser to log in..."
  supabase login
  echo ""
fi

# --- Deploy -------------------------------------------------------------------

if [[ "${FUNCTION_NAME}" == "openai-chat" ]]; then
  echo "Deploying openai-chat with updated CORS headers..."
  echo ""
  echo "CORS headers include: authorization, x-client-info, apikey, content-type, cache-control, pragma"
  echo ""
else
  echo "Deploying ${FUNCTION_NAME}..."
  echo ""
fi

# Use --use-api flag to deploy without requiring database password/linking
supabase functions deploy "${FUNCTION_NAME}" --project-ref "${PROJECT_REF}" --use-api

echo ""
echo "✅ Deployment successful!"
echo ""

# Show functions table so you can confirm status is Active
echo "Current Edge Functions:"
supabase functions list --project-ref "${PROJECT_REF}"
echo ""

# --- Next steps ---------------------------------------------------------------

echo "Next steps:"
if [[ "${FUNCTION_NAME}" == "nutrition-gemini" ]]; then
  echo "1) In the app, log a meal with branded/fast-food items and confirm a response."
  echo "2) Verify telemetry rows in admin_action_logs."
else
  echo "1) Test in staging by sending these 3 messages:"
  echo "   - 'hey'"
  echo "   - 'what are the macros of an avocado'"
  echo "   - 'i ate 2 eggs and toast for breakfast'"
  echo "2) Verify telemetry is being logged to admin_action_logs table."
fi
