#!/bin/bash
#
# Deploy openai-chat edge function with CORS fix
# This fixes the "pragma" and "cache-control" CORS header issues
#

cd "$(dirname "$0")"

echo "Deploying openai-chat with updated CORS headers..."
echo ""
echo "CORS headers now include: authorization, x-client-info, apikey, content-type, cache-control, pragma"
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "ERROR: Supabase CLI not found. Please install it first."
    echo "Visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Deploy the function
supabase functions deploy openai-chat --project-ref jdtogitfqptdrxkczdbw

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "Next steps:"
    echo "1. Test in staging by sending these 3 messages:"
    echo "   - 'hey'"
    echo "   - 'what are the macros of an avocado'"
    echo "   - 'i ate 2 eggs and toast for breakfast'"
    echo ""
    echo "2. Verify telemetry is being logged to admin_action_logs table"
else
    echo ""
    echo "❌ Deployment failed. Check error messages above."
    exit 1
fi
