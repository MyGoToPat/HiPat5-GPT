import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

// Admin validation helper
async function validateAdmin(req: Request, supabase: any): Promise<{ user: any; error?: string }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return { user: null, error: 'Missing authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return { user: null, error: 'Invalid or expired token' };
  }

  // Check admin status (try multiple methods)
  // Method 1: app_metadata.role
  if (user.app_metadata?.role === 'admin') {
    return { user };
  }

  // Method 2: profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profile?.role === 'admin') {
    return { user };
  }

  return { user: null, error: 'Forbidden: Admin access required' };
}

// Audit logging helper
async function logAdminAction(
  supabase: any,
  actor_uid: string,
  action: string,
  target: string,
  payload: any
) {
  try {
    await supabase.from('admin_action_logs').insert({
      actor_uid,
      action,
      target,
      payload: payload || null,
    });
  } catch (error) {
    console.error('[audit-log] Failed to log action:', error);
    // Don't fail the request if audit logging fails
  }
}

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
      const pathParts = path.split('/').filter(p => p);
      const swarmId = pathParts[1];

      // Handle /swarms/:swarm_id/versions POST
      if (pathParts[2] === 'versions' && method === 'POST') {
        // Validate admin
        const { user, error: authError } = await validateAdmin(req, supabase);
        if (authError) {
          return new Response(JSON.stringify({ error: authError }), {
            status: user ? 403 : 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const body = await req.json();

        // Validate required fields
        if (!body.manifest) {
          return new Response(JSON.stringify({ error: 'Missing required field: manifest' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Create draft version
        const versionData = {
          swarm_id: swarmId,
          manifest: body.manifest,
          status: 'draft',
          rollout_percent: 0,
          created_by: user.id,
        };

        const { data, error } = await supabase.from('swarm_versions').insert(versionData).select().single();
        if (error) throw error;

        // Audit log
        await logAdminAction(supabase, user.id, 'create_swarm_draft', `swarm_versions:${data.id}`, {
          swarm_id: swarmId,
        });

        return new Response(JSON.stringify({ ok: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Handle /swarms/:id PUT/DELETE
      if (pathParts.length === 2) {
        if (method === 'PUT') {
          const body = await req.json();
          const { data, error } = await supabase.from('swarms').update(body).eq('id', swarmId).select().single();
          if (error) throw error;
          return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (method === 'DELETE') {
          const { error } = await supabase.from('swarms').delete().eq('id', swarmId);
          if (error) throw error;
          return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
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
        // Validate admin
        const { user, error: authError } = await validateAdmin(req, supabase);
        if (authError) {
          return new Response(JSON.stringify({ error: authError }), {
            status: user ? 403 : 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const body = await req.json();

        // Validate required fields
        if (!body.agent_key || !body.model || !body.prompt) {
          return new Response(JSON.stringify({ error: 'Missing required fields: agent_key, model, prompt' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Map API fields to database schema
        const promptData = {
          agent_id: body.agent_key,
          title: body.title || `${body.agent_key} prompt`,
          content: body.prompt,
          model: body.model,
          phase: body.phase || 'core',
          exec_order: body.exec_order || 50,
          status: 'draft',
          created_by: user.id,
        };

        const { data, error } = await supabase.from('agent_prompts').insert(promptData).select().single();
        if (error) throw error;

        // Audit log
        await logAdminAction(supabase, user.id, 'create_prompt_draft', `agent_prompts:${data.id}`, {
          agent_key: body.agent_key,
          model: body.model,
        });

        return new Response(JSON.stringify({ ok: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
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
        // Validate admin
        const { user, error: authError } = await validateAdmin(req, supabase);
        if (authError) {
          return new Response(JSON.stringify({ error: authError }), {
            status: user ? 403 : 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Get the prompt to find its agent_id
        const { data: prompt } = await supabase
          .from('agent_prompts')
          .select('agent_id')
          .eq('id', id)
          .single();

        if (!prompt) {
          return new Response(JSON.stringify({ error: 'Prompt not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Archive any existing published prompts for this agent_id
        await supabase
          .from('agent_prompts')
          .update({ status: 'archived' })
          .eq('agent_id', prompt.agent_id)
          .eq('status', 'published');

        // Publish this prompt
        const { data, error } = await supabase
          .from('agent_prompts')
          .update({ status: 'published' })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        // Audit log
        await logAdminAction(supabase, user.id, 'publish_prompt', `agent_prompts:${id}`, {
          agent_id: prompt.agent_id,
        });

        return new Response(JSON.stringify({ ok: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
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
      const pathParts = path.split('/').filter(p => p);
      const id = pathParts[1];
      const action = pathParts[2]; // 'publish' or 'rollout'

      if (action === 'publish' && method === 'PUT') {
        // Validate admin
        const { user, error: authError } = await validateAdmin(req, supabase);
        if (authError) {
          return new Response(JSON.stringify({ error: authError }), {
            status: user ? 403 : 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Get the version to find its swarm_id
        const { data: version } = await supabase
          .from('swarm_versions')
          .select('swarm_id')
          .eq('id', id)
          .single();

        if (!version) {
          return new Response(JSON.stringify({ error: 'Version not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Archive any existing published versions for this swarm
        await supabase
          .from('swarm_versions')
          .update({ status: 'archived' })
          .eq('swarm_id', version.swarm_id)
          .eq('status', 'published');

        // Publish this version
        const { data, error } = await supabase
          .from('swarm_versions')
          .update({
            status: 'published',
            published_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        // Audit log
        await logAdminAction(supabase, user.id, 'publish_swarm', `swarm_versions:${id}`, {
          swarm_id: version.swarm_id,
        });

        return new Response(JSON.stringify({ ok: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (action === 'rollout' && method === 'PUT') {
        // Validate admin
        const { user, error: authError } = await validateAdmin(req, supabase);
        if (authError) {
          return new Response(JSON.stringify({ error: authError }), {
            status: user ? 403 : 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const body = await req.json();

        // Validate rollout_percent
        if (body.rollout_percent !== undefined) {
          const percent = Number(body.rollout_percent);
          if (isNaN(percent) || percent < 0 || percent > 100) {
            return new Response(JSON.stringify({ error: 'rollout_percent must be between 0 and 100' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

        // Validate cohort
        if (body.cohort && !['beta', 'paid', 'all'].includes(body.cohort)) {
          return new Response(JSON.stringify({ error: 'cohort must be one of: beta, paid, all' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Update rollout
        const updateData: any = {};
        if (body.rollout_percent !== undefined) updateData.rollout_percent = body.rollout_percent;
        if (body.cohort) updateData.cohort = body.cohort;

        const { data, error } = await supabase
          .from('swarm_versions')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        // Audit log
        await logAdminAction(supabase, user.id, 'update_rollout', `swarm_versions:${id}`, updateData);

        return new Response(JSON.stringify({ ok: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Generic PUT for other updates
      if (method === 'PUT' && !action) {
        const body = await req.json();
        const { data, error} = await supabase.from('swarm_versions').update(body).eq('id', id).select().single();
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

    // Agent Configs CRUD
    if (path === '/agent-configs') {
      if (method === 'GET') {
        const { data, error } = await supabase.from('agent_configs').select('*').order('updated_at', { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (method === 'POST') {
        // Validate admin
        const { user, error: authError } = await validateAdmin(req, supabase);
        if (authError) {
          return new Response(JSON.stringify({ error: authError }), {
            status: user ? 403 : 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const body = await req.json();
        if (!body.agent_key || !body.config) {
          return new Response(JSON.stringify({ error: 'Missing required fields: agent_key, config' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data, error } = await supabase.from('agent_configs').insert(body).select().single();
        if (error) throw error;

        await logAdminAction(supabase, user.id, 'create_agent_config', `agent_configs:${data.id}`, { agent_key: body.agent_key });

        return new Response(JSON.stringify({ ok: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (path.startsWith('/agent-configs/')) {
      const pathParts = path.split('/').filter(p => p);
      const agentKey = pathParts[1];

      if (method === 'GET') {
        const { data, error } = await supabase.from('agent_configs').select('*').eq('agent_key', agentKey).maybeSingle();
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (method === 'PUT') {
        // Validate admin
        const { user, error: authError } = await validateAdmin(req, supabase);
        if (authError) {
          return new Response(JSON.stringify({ error: authError }), {
            status: user ? 403 : 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const body = await req.json();
        const { data, error } = await supabase.from('agent_configs')
          .update({ config: body.config, updated_at: new Date().toISOString() })
          .eq('agent_key', agentKey)
          .select()
          .single();

        if (error) throw error;

        await logAdminAction(supabase, user.id, 'update_agent_config', `agent_configs:${agentKey}`, body);

        return new Response(JSON.stringify({ ok: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (method === 'DELETE') {
        // Validate admin
        const { user, error: authError } = await validateAdmin(req, supabase);
        if (authError) {
          return new Response(JSON.stringify({ error: authError }), {
            status: user ? 403 : 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { error } = await supabase.from('agent_configs').delete().eq('agent_key', agentKey);
        if (error) throw error;

        await logAdminAction(supabase, user.id, 'delete_agent_config', `agent_configs:${agentKey}`, null);

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Agent Config Validation
    if (path === '/agent-configs/validate') {
      if (method === 'POST') {
        const body = await req.json();
        const { agent_key, config } = body;

        // Role-specific terms that should NOT appear in personality agents
        const roleTerms = [
          'fitness', 'nutrition', 'exercise', 'physiology', 'health', 'performance',
          'TDEE', 'macros', 'biochemistry', 'sports medicine', 'workout', 'training',
          'meal', 'diet', 'calories', 'protein', 'carbs', 'fat', 'fiber'
        ];

        const personalityAgents = ['persona', 'PERSONA_MASTER', 'PERSONA_EMPATHY', 'PERSONA_AUDIENCE', 'POST_CLARITY'];
        const isPersonalityAgent = personalityAgents.some(pa => agent_key.includes(pa));

        const violations: string[] = [];
        if (isPersonalityAgent && config) {
          const configStr = JSON.stringify(config).toLowerCase();
          roleTerms.forEach(term => {
            if (configStr.includes(term.toLowerCase())) {
              violations.push(`Found role-specific term "${term}" in personality agent`);
            }
          });
        }

        return new Response(JSON.stringify({
          valid: violations.length === 0,
          violations,
          isPersonalityAgent,
          checkedTerms: roleTerms.length
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
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