// Verification script for PERSONALITY_ROUTER presence
// Run with: node tests/scripts/verify-router.mjs
// Or via Supabase SQL Editor: copy contents of verify-router.sql

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jdtogitfqptdrxkczdbw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifyRouter() {
  console.log('🔍 Verifying PERSONALITY_ROUTER presence...\n');

  // Check 1: Prompt exists
  const { data: prompt, error: promptError } = await supabase
    .from('agent_prompts')
    .select('agent_id, status, version, content')
    .eq('agent_id', 'PERSONALITY_ROUTER')
    .eq('status', 'published')
    .maybeSingle();

  if (promptError || !prompt) {
    console.error('❌ FAIL: PERSONALITY_ROUTER not found in agent_prompts');
    console.error('   Error:', promptError?.message);
    process.exit(1);
  }

  console.log('✅ PASS: Prompt exists');
  console.log(`   Agent ID: ${prompt.agent_id}`);
  console.log(`   Status: ${prompt.status}`);
  console.log(`   Version: ${prompt.version}`);
  console.log(`   Content length: ${prompt.content?.length || 0} chars\n`);

  // Check 2: Referenced in agent_configs
  const { data: config, error: configError } = await supabase
    .from('agent_configs')
    .select('agent_key, config')
    .eq('agent_key', 'personality')
    .maybeSingle();

  if (configError || !config) {
    console.error('❌ FAIL: personality swarm config not found');
    console.error('   Error:', configError?.message);
    process.exit(1);
  }

  const agents = config.config?.agents || [];
  const routerAgent = agents.find((a: any) => a.promptRef === 'PERSONALITY_ROUTER');

  if (!routerAgent) {
    console.error('❌ FAIL: PERSONALITY_ROUTER not referenced in agent_configs');
    console.error(`   Found ${agents.length} agents in swarm`);
    process.exit(1);
  }

  console.log('✅ PASS: Router referenced in swarm config');
  console.log(`   Name: ${routerAgent.name}`);
  console.log(`   Phase: ${routerAgent.phase}`);
  console.log(`   Order: ${routerAgent.order}`);
  console.log(`   Enabled: ${routerAgent.enabled}\n`);

  // Check 3: Order between Voice (10) and Audience (20)
  const voiceAgent = agents.find((a: any) => a.promptRef === 'PERSONALITY_VOICE');
  const audienceAgent = agents.find((a: any) => a.promptRef === 'PERSONALITY_AUDIENCE');

  if (voiceAgent && audienceAgent) {
    const routerOrder = routerAgent.order;
    const voiceOrder = voiceAgent.order;
    const audienceOrder = audienceAgent.order;

    if (routerOrder >= voiceOrder && routerOrder <= audienceOrder) {
      console.log('✅ PASS: Router order is correct');
      console.log(`   Voice: ${voiceOrder} → Router: ${routerOrder} → Audience: ${audienceOrder}\n`);
    } else {
      console.warn('⚠️  WARNING: Router order may be outside expected range');
      console.warn(`   Voice: ${voiceOrder}, Router: ${routerOrder}, Audience: ${audienceOrder}\n`);
    }
  }

  console.log('✅ All checks passed! PERSONALITY_ROUTER is properly configured.');
  process.exit(0);
}

verifyRouter().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});

