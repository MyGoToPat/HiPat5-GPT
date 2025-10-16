import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);
    const path = url.pathname.replace('/swarm-admin-api', '');
    const method = req.method;

    // Health check
    if (path === '/health') {
      const { data, error } = await supabase.from('swarms').select('id').limit(1);
      return new Response(
        JSON.stringify({ status: 'ok', canReadSwarms: !error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Swarms CRUD
    if (path === '/swarms') {
      if (method === 'GET') {
        const { data, error } = await supabase.from('swarms').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (method === 'POST') {
        const body = await req.json();
        const { data, error } = await supabase.from('swarms').insert(body).select().single();
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (path.startsWith('/swarms/')) {
      const id = path.split('/')[2];
      if (method === 'PUT') {
        const body = await req.json();
        const { data, error } = await supabase.from('swarms').update(body).eq('id', id).select().single();
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (method === 'DELETE') {
        const { error } = await supabase.from('swarms').delete().eq('id', id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Agent Prompts CRUD
    if (path === '/agent-prompts') {
      if (method === 'GET') {
        const agentId = url.searchParams.get('agent_id');
        let query = supabase.from('agent_prompts').select('*');
        if (agentId) query = query.eq('agent_id', agentId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (method === 'POST') {
        const body = await req.json();
        const { data, error } = await supabase.from('agent_prompts').insert(body).select().single();
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (path.startsWith('/agent-prompts/')) {
      const id = path.split('/')[2];
      if (method === 'PUT') {
        const body = await req.json();
        const { data, error } = await supabase.from('agent_prompts').update(body).eq('id', id).select().single();
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (method === 'DELETE') {
        const { error } = await supabase.from('agent_prompts').delete().eq('id', id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (path.endsWith('/publish')) {
        const { data, error } = await supabase.from('agent_prompts').update({ status: 'published' }).eq('id', id).select().single();
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Swarm Agents CRUD
    if (path === '/swarm-agents') {
      if (method === 'GET') {
        const swarmId = url.searchParams.get('swarm_id');
        let query = supabase.from('swarm_agents').select('*, agent_prompts(*)');
        if (swarmId) query = query.eq('swarm_id', swarmId);
        const { data, error } = await query.order('phase').order('exec_order');
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (method === 'POST') {
        const body = await req.json();
        const { data, error } = await supabase.from('swarm_agents').insert(body).select().single();
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Swarm Versions CRUD
    if (path === '/swarm-versions') {
      if (method === 'GET') {
        const swarmId = url.searchParams.get('swarm_id');
        let query = supabase.from('swarm_versions').select('*');
        if (swarmId) query = query.eq('swarm_id', swarmId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (method === 'POST') {
        const body = await req.json();
        const { data, error } = await supabase.from('swarm_versions').insert(body).select().single();
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (path.startsWith('/swarm-versions/')) {
      const id = path.split('/')[2];
      if (method === 'PUT') {
        const body = await req.json();
        const { data, error} = await supabase.from('swarm_versions').update(body).eq('id', id).select().single();
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (path.endsWith('/publish')) {
        const { error } = await supabase.rpc('publish_swarm_version', { p_version_id: id });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Test Runs CRUD
    if (path === '/agent-test-runs') {
      if (method === 'GET') {
        const { data, error } = await supabase.from('agent_test_runs').select('*').order('created_at', { ascending: false }).limit(50);
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (method === 'POST') {
        const body = await req.json();
        const { data, error } = await supabase.from('agent_test_runs').insert(body).select().single();
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Dietary Filter Rules
    if (path === '/dietary-filter-rules') {
      if (method === 'GET') {
        const { data, error } = await supabase.from('dietary_filter_rules').select('*').order('type');
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Admin API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});