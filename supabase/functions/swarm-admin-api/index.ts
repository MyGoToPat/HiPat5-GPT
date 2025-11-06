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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Create service role client for all DB operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const url = new URL(req.url);
    const path = url.pathname.replace('/swarm-admin-api', '');
    const method = req.method;
    let body: any = null;

    // Parse request body if present
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // No body or invalid JSON - continue
    }

    // Handle operation-based requests (from supabase.functions.invoke)
    // Body format: { op: 'updatePrompt', agent_id: '...', content: '...', ... }
    if (body?.op) {
      // Health check (no auth required)
      if (body.op === 'health') {
        return new Response(JSON.stringify({ ok: true, service: 'swarm-admin-api' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { user, error: authError } = await validateAdmin(req, supabaseAdmin);
      if (authError) {
        return new Response(JSON.stringify({ 
          ok: false, 
          op: body.op, 
          error: authError,
          detail: authError.includes('Missing') ? 'Missing authorization header' : 'Invalid or insufficient permissions'
        }), {
          status: authError.includes('Missing') ? 401 : 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (body.op === 'updatePrompt') {
        try {
          const agentId = body.agent_id;
          const content = body.content;
          const status = body.status || 'published';
          const version = body.version || 1; // Default to version 1

          if (!agentId || !content) {
            return new Response(JSON.stringify({ 
              ok: false, 
              op: 'updatePrompt', 
              error: 'Missing required fields', 
              detail: !agentId ? 'agent_id is required' : 'content is required'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // Update by agent_id + version (exact match)
          const { data, error } = await supabaseAdmin
            .from('agent_prompts')
            .update({ content, status })
            .eq('agent_id', agentId)
            .eq('version', version)
            .select()
            .maybeSingle();

          if (error) {
            console.error('[swarm-admin-api] updatePrompt DB error:', { agent_id: agentId, version, error: error.message });
            throw error;
          }

          if (!data) {
            return new Response(JSON.stringify({ 
              ok: false, 
              op: 'updatePrompt', 
              error: 'Prompt not found', 
              detail: `No row found for agent_id="${agentId}" and version=${version}`
            }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          await logAdminAction(supabaseAdmin, user.id, 'update_prompt', `agent_prompts:${data.id}`, {
            agent_id: data.agent_id,
            version: data.version,
            updated_fields: ['content', 'status'],
          });

          return new Response(JSON.stringify({ ok: true, data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          console.error('[swarm-admin-api] updatePrompt exception:', { 
            agent_id: body.agent_id, 
            op: 'updatePrompt',
            error: err.message || String(err)
          });
          return new Response(JSON.stringify({ 
            ok: false, 
            op: 'updatePrompt', 
            error: 'Update failed', 
            detail: err.message || String(err)
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      if (body.op === 'createPrompt') {
        try {
          const agentId = body.agent_id;
          const content = body.content;
          const status = body.status || 'published';

          if (!agentId || !content) {
            return new Response(JSON.stringify({ 
              ok: false, 
              op: 'createPrompt', 
              error: 'Missing required fields', 
              detail: !agentId ? 'agent_id is required' : 'content is required'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const { data: existing } = await supabaseAdmin
            .from('agent_prompts')
            .select('id, version')
            .eq('agent_id', agentId)
            .eq('status', 'published')
            .order('version', { ascending: false })
            .limit(1)
            .maybeSingle();

          let result;
          if (existing && status === 'published') {
            const { data, error } = await supabaseAdmin
              .from('agent_prompts')
              .update({ content })
              .eq('id', existing.id)
              .select()
              .single();
            if (error) throw error;
            result = data;
          } else {
            const version = existing ? existing.version + 1 : 1;
            const promptData = {
              agent_id: agentId,
              title: body.title || `${agentId} prompt`,
              content,
              model: body.model || 'gpt-4o-mini',
              phase: body.phase || 'pre',
              exec_order: body.exec_order || body.order || 50, // ✅ Use exec_order, not "order"
              status,
              version,
              created_by: user.id,
            };

            const { data, error } = await supabaseAdmin.from('agent_prompts').insert(promptData).select().single();
            if (error) throw error;
            result = data;
          }

          await logAdminAction(supabaseAdmin, user.id, existing ? 'update_prompt' : 'create_prompt', `agent_prompts:${result.id}`, {
            agent_id: agentId,
            status: result.status,
          });

          return new Response(JSON.stringify({ ok: true, data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          console.error('[swarm-admin-api] createPrompt exception:', { 
            agent_id: body.agent_id, 
            op: 'createPrompt',
            error: err.message || String(err)
          });
          return new Response(JSON.stringify({ 
            ok: false, 
            op: 'createPrompt', 
            error: 'Create failed', 
            detail: err.message || String(err)
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      if (body.op === 'addAgentToSwarm') {
        try {
          const agentKey = body.agentKey || 'personality';
          if (!body.promptRef || !body.name || body.phase === undefined || body.order === undefined) {
            return new Response(JSON.stringify({ 
              ok: false, 
              op: 'addAgentToSwarm', 
              error: 'Missing required fields', 
              detail: 'promptRef, name, phase, and order are required'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const { data: currentConfig, error: fetchError } = await supabaseAdmin
            .from('agent_configs')
            .select('config')
            .eq('agent_key', agentKey)
            .single();

          if (fetchError || !currentConfig) {
            return new Response(JSON.stringify({ 
              ok: false, 
              op: 'addAgentToSwarm', 
              error: 'Swarm config not found', 
              detail: `No config found for agent_key="${agentKey}"`
            }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const agents = currentConfig.config?.agents || [];
          
          if (agents.some((a: any) => a.promptRef === body.promptRef)) {
            return new Response(JSON.stringify({ 
              ok: false, 
              op: 'addAgentToSwarm', 
              error: 'Agent already exists', 
              detail: `Agent with promptRef "${body.promptRef}" already exists in swarm`
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // ✅ Use "order" in JSON config (not exec_order)
          const newAgent = {
            id: body.id || `agent-${Date.now()}`,
            name: body.name,
            promptRef: body.promptRef,
            phase: body.phase,
            order: body.order, // ✅ JSON key is "order"
            enabled: body.enabled !== undefined ? body.enabled : true,
          };

          const updatedAgents = [...agents, newAgent].sort((a: any, b: any) => {
            const phaseOrder = { pre: 1, main: 2, post: 3 };
            const phaseDiff = (phaseOrder[a.phase] || 99) - (phaseOrder[b.phase] || 99);
            return phaseDiff !== 0 ? phaseDiff : a.order - b.order;
          });

          const { data, error } = await supabaseAdmin
            .from('agent_configs')
            .update({ 
              config: { ...currentConfig.config, agents: updatedAgents },
              updated_at: new Date().toISOString()
            })
            .eq('agent_key', agentKey)
            .select()
            .single();

          if (error) throw error;

          await logAdminAction(supabaseAdmin, user.id, 'add_agent_to_swarm', `agent_configs:${agentKey}`, {
            promptRef: body.promptRef,
            name: body.name,
          });

          return new Response(JSON.stringify({ ok: true, data, agent: newAgent }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          console.error('[swarm-admin-api] addAgentToSwarm exception:', { 
            promptRef: body.promptRef, 
            op: 'addAgentToSwarm',
            error: err.message || String(err)
          });
          return new Response(JSON.stringify({ 
            ok: false, 
            op: 'addAgentToSwarm', 
            error: 'Add agent failed', 
            detail: err.message || String(err)
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // Handle invoke-style requests (from supabase.functions.invoke with method/path)
    // Body format: { method: 'PUT', path: '/agent-prompts/:id', content: '...', ... }
    if (body?.method && body?.path) {
      const invokeMethod = body.method;
      const invokePath = body.path;
      const invokeBody = { ...body };
      delete invokeBody.method;
      delete invokeBody.path;

      // Route based on invoke path
      if (invokePath.startsWith('/agent-prompts/')) {
        const agentId = invokePath.split('/')[2];
        if (invokeMethod === 'PUT') {
          const { user, error: authError } = await validateAdmin(req, supabaseAdmin);
          if (authError) {
            return new Response(JSON.stringify({ error: authError }), {
              status: authError.includes('Missing') ? 401 : 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          let query = supabaseAdmin.from('agent_prompts');
          if (agentId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            query = query.eq('id', agentId);
          } else {
            query = query.eq('agent_id', agentId).eq('status', 'published').order('version', { ascending: false }).limit(1);
          }

          const { data: existing } = await query.select('id').maybeSingle();
          if (!existing) {
            return new Response(JSON.stringify({ error: 'Prompt not found' }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const updateData: any = {};
          if (invokeBody.content !== undefined) updateData.content = invokeBody.content;
          if (invokeBody.status !== undefined) updateData.status = invokeBody.status;

          const { data, error } = await supabaseAdmin
            .from('agent_prompts')
            .update(updateData)
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw error;

          await logAdminAction(supabaseAdmin, user.id, 'update_prompt', `agent_prompts:${existing.id}`, {
            agent_id: data.agent_id,
            updated_fields: Object.keys(updateData),
          });

          return new Response(JSON.stringify({ ok: true, data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      if (invokePath === '/agent-prompts' && invokeMethod === 'POST') {
        const { user, error: authError } = await validateAdmin(req, supabaseAdmin);
        if (authError) {
          return new Response(JSON.stringify({ error: authError }), {
            status: authError.includes('Missing') ? 401 : 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const agentId = invokeBody.agent_id || invokeBody.agent_key;
        const content = invokeBody.content || invokeBody.prompt;
        const status = invokeBody.status || 'published';

        if (!agentId || !content) {
          return new Response(JSON.stringify({ error: 'Missing required fields: agent_id (or agent_key), content (or prompt)' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: existing } = await supabaseAdmin
          .from('agent_prompts')
          .select('id, version')
          .eq('agent_id', agentId)
          .eq('status', 'published')
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();

        let result;
        if (existing && status === 'published') {
          const { data, error } = await supabaseAdmin
            .from('agent_prompts')
            .update({ content })
            .eq('id', existing.id)
            .select()
            .single();
          if (error) throw error;
          result = data;
        } else {
          const version = existing ? existing.version + 1 : 1;
          const promptData = {
            agent_id: agentId,
            title: invokeBody.title || `${agentId} prompt`,
            content,
            model: invokeBody.model || 'gpt-4o-mini',
            phase: invokeBody.phase || 'pre',
            exec_order: invokeBody.exec_order || invokeBody.order || 50,
            status,
            version,
            created_by: user.id,
          };

          const { data, error } = await supabaseAdmin.from('agent_prompts').insert(promptData).select().single();
          if (error) throw error;
          result = data;
        }

        await logAdminAction(supabaseAdmin, user.id, existing ? 'update_prompt' : 'create_prompt', `agent_prompts:${result.id}`, {
          agent_id: agentId,
          status: result.status,
        });

        return new Response(JSON.stringify({ ok: true, data: result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (invokePath === '/agent-configs/personality/agents' && invokeMethod === 'POST') {
        const { user, error: authError } = await validateAdmin(req, supabaseAdmin);
        if (authError) {
          return new Response(JSON.stringify({ error: authError }), {
            status: authError.includes('Missing') ? 401 : 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (!invokeBody.promptRef || !invokeBody.name || invokeBody.phase === undefined || invokeBody.order === undefined) {
          return new Response(JSON.stringify({ error: 'Missing required fields: promptRef, name, phase, order' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: currentConfig, error: fetchError } = await supabaseAdmin
          .from('agent_configs')
          .select('config')
          .eq('agent_key', 'personality')
          .single();

        if (fetchError || !currentConfig) {
          return new Response(JSON.stringify({ error: 'Swarm config not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const agents = currentConfig.config?.agents || [];
        
        if (agents.some((a: any) => a.promptRef === invokeBody.promptRef)) {
          return new Response(JSON.stringify({ error: `Agent with promptRef "${invokeBody.promptRef}" already exists` }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const newAgent = {
          id: invokeBody.id || `agent-${Date.now()}`,
          name: invokeBody.name,
          promptRef: invokeBody.promptRef,
          phase: invokeBody.phase,
          order: invokeBody.order,
          enabled: invokeBody.enabled !== undefined ? invokeBody.enabled : true,
        };

        const updatedAgents = [...agents, newAgent].sort((a: any, b: any) => {
          const phaseOrder = { pre: 1, main: 2, post: 3 };
          const phaseDiff = (phaseOrder[a.phase] || 99) - (phaseOrder[b.phase] || 99);
          return phaseDiff !== 0 ? phaseDiff : a.order - b.order;
        });

        const { data, error } = await supabaseAdmin
          .from('agent_configs')
          .update({ 
            config: { ...currentConfig.config, agents: updatedAgents },
            updated_at: new Date().toISOString()
          })
          .eq('agent_key', 'personality')
          .select()
          .single();

        if (error) throw error;

        await logAdminAction(supabaseAdmin, user.id, 'add_agent_to_swarm', `agent_configs:personality`, {
          promptRef: invokeBody.promptRef,
          name: invokeBody.name,
        });

        return new Response(JSON.stringify({ ok: true, data, agent: newAgent }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Continue with existing path-based routing for direct HTTP requests
    const supabase = supabaseAdmin;

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
        const requestBody = body || await req.json();
        const { data, error } = await supabase.from('swarms').insert(requestBody).select().single();
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

        const requestBody = body || await req.json();

        // Validate required fields
        if (!requestBody.manifest) {
          return new Response(JSON.stringify({ error: 'Missing required field: manifest' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Create draft version
        const versionData = {
          swarm_id: swarmId,
          manifest: requestBody.manifest,
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
          const requestBody = body || await req.json();
          const { data, error } = await supabase.from('swarms').update(requestBody).eq('id', swarmId).select().single();
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

        const requestBody = body || await req.json();

        // Support both old format (agent_key, prompt) and new format (agent_id, content, status)
        const agentId = requestBody.agent_id || requestBody.agent_key;
        const content = requestBody.content || requestBody.prompt;
        const status = requestBody.status || 'published'; // Default to published for swarm prompts

        if (!agentId || !content) {
          return new Response(JSON.stringify({ error: 'Missing required fields: agent_id (or agent_key), content (or prompt)' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Check if prompt already exists for this agent_id
        const { data: existing } = await supabase
          .from('agent_prompts')
          .select('id, version')
          .eq('agent_id', agentId)
          .eq('status', 'published')
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();

        let result;
        if (existing && status === 'published') {
          // Update existing published version
          const { data, error } = await supabase
            .from('agent_prompts')
            .update({ content })
            .eq('id', existing.id)
            .select()
            .single();
          if (error) throw error;
          result = data;
        } else {
          // Create new version
          const version = existing ? existing.version + 1 : 1;
          const promptData = {
            agent_id: agentId,
            title: requestBody.title || `${agentId} prompt`,
            content,
            model: requestBody.model || 'gpt-4o-mini',
            phase: requestBody.phase || 'pre',
            exec_order: requestBody.exec_order || requestBody.order || 50,
            status,
            version,
            created_by: user.id,
          };

          const { data, error } = await supabase.from('agent_prompts').insert(promptData).select().single();
          if (error) throw error;
          result = data;
        }

        // Audit log
        await logAdminAction(supabase, user.id, existing ? 'update_prompt' : 'create_prompt', `agent_prompts:${result.id}`, {
          agent_id: agentId,
          status: result.status,
        });

        return new Response(JSON.stringify({ ok: true, data: result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (path.startsWith('/agent-prompts/')) {
      const pathParts = path.split('/').filter(p => p);
      const identifier = pathParts[1]; // Could be 'id' (UUID) or 'agent_id' (string)
      
      if (method === 'PUT') {
        // Validate admin
        const { user, error: authError } = await validateAdmin(req, supabase);
        if (authError) {
          return new Response(JSON.stringify({ error: authError }), {
            status: user ? 403 : 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const requestBody = body || await req.json();

        // Support updating by UUID (id) or by agent_id
        let query = supabase.from('agent_prompts');
        if (identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          // UUID format - update by id
          query = query.eq('id', identifier);
        } else {
          // agent_id format - update latest published version
          query = query.eq('agent_id', identifier).eq('status', 'published').order('version', { ascending: false }).limit(1);
        }

        const { data: existing } = await query.select('id').maybeSingle();
        if (!existing) {
          return new Response(JSON.stringify({ error: 'Prompt not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Update content and optionally status
        const updateData: any = {};
        if (requestBody.content !== undefined) updateData.content = requestBody.content;
        if (requestBody.status !== undefined) updateData.status = requestBody.status;

        const { data, error } = await supabase
          .from('agent_prompts')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;

        await logAdminAction(supabase, user.id, 'update_prompt', `agent_prompts:${existing.id}`, {
          agent_id: data.agent_id,
          updated_fields: Object.keys(updateData),
        });

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

        // Support deleting by UUID (id) or by agent_id
        let query = supabase.from('agent_prompts');
        if (identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          query = query.eq('id', identifier);
        } else {
          query = query.eq('agent_id', identifier);
        }

        const { error } = await query.delete();
        if (error) throw error;

        await logAdminAction(supabase, user.id, 'delete_prompt', `agent_prompts:${identifier}`, null);

        return new Response(JSON.stringify({ success: true }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      if (path.endsWith('/publish')) {
        const id = pathParts[1];
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
        const requestBody = body || await req.json();
        const { data, error } = await supabase.from('swarm_agents').insert(requestBody).select().single();
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
        const requestBody = body || await req.json();
        const { data, error } = await supabase.from('swarm_versions').insert(requestBody).select().single();
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
          .update({ status: 'published' })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        // Audit log
        await logAdminAction(supabase, user.id, 'publish_swarm_version', `swarm_versions:${id}`, {
          swarm_id: version.swarm_id,
        });

        return new Response(JSON.stringify({ ok: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
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

        const requestBody = body || await req.json();
        if (!requestBody.agent_key || !requestBody.config) {
          return new Response(JSON.stringify({ error: 'Missing required fields: agent_key, config' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data, error } = await supabase.from('agent_configs').insert(requestBody).select().single();
        if (error) throw error;

        await logAdminAction(supabase, user.id, 'create_agent_config', `agent_configs:${data.id}`, { agent_key: requestBody.agent_key });

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

        const requestBody = body || await req.json();
        const { data, error } = await supabase.from('agent_configs')
          .update({ config: requestBody.config, updated_at: new Date().toISOString() })
          .eq('agent_key', agentKey)
          .select()
          .single();

        if (error) throw error;

        await logAdminAction(supabase, user.id, 'update_agent_config', `agent_configs:${agentKey}`, requestBody);

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

      // POST /agent-configs/:agentKey/agents - Add agent to swarm config
      if (pathParts.length === 3 && pathParts[2] === 'agents' && method === 'POST') {
        // Validate admin
        const { user, error: authError } = await validateAdmin(req, supabase);
        if (authError) {
          return new Response(JSON.stringify({ error: authError }), {
            status: user ? 403 : 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const requestBody = body || await req.json();
        if (!requestBody.promptRef || !requestBody.name || requestBody.phase === undefined || requestBody.order === undefined) {
          return new Response(JSON.stringify({ error: 'Missing required fields: promptRef, name, phase, order' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Get current config
        const { data: currentConfig, error: fetchError } = await supabase
          .from('agent_configs')
          .select('config')
          .eq('agent_key', agentKey)
          .single();

        if (fetchError || !currentConfig) {
          return new Response(JSON.stringify({ error: 'Swarm config not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const agents = currentConfig.config?.agents || [];
        
        // Check if agent already exists
        const exists = agents.some((a: any) => a.promptRef === requestBody.promptRef);
        if (exists) {
          return new Response(JSON.stringify({ error: `Agent with promptRef "${requestBody.promptRef}" already exists` }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Add new agent
        const newAgent = {
          id: requestBody.id || `agent-${Date.now()}`,
          name: requestBody.name,
          promptRef: requestBody.promptRef,
          phase: requestBody.phase,
          order: requestBody.order,
          enabled: requestBody.enabled !== undefined ? requestBody.enabled : true,
        };

        const updatedAgents = [...agents, newAgent].sort((a: any, b: any) => {
          const phaseOrder = { pre: 1, main: 2, post: 3 };
          const phaseDiff = (phaseOrder[a.phase] || 99) - (phaseOrder[b.phase] || 99);
          return phaseDiff !== 0 ? phaseDiff : a.order - b.order;
        });

        const { data, error } = await supabase
          .from('agent_configs')
          .update({ 
            config: { ...currentConfig.config, agents: updatedAgents },
            updated_at: new Date().toISOString()
          })
          .eq('agent_key', agentKey)
          .select()
          .single();

        if (error) throw error;

        await logAdminAction(supabase, user.id, 'add_agent_to_swarm', `agent_configs:${agentKey}`, {
          promptRef: requestBody.promptRef,
          name: requestBody.name,
        });

        return new Response(JSON.stringify({ ok: true, data, agent: newAgent }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // PUT /agent-configs/:agentKey/agents/:promptRef - Update agent in swarm config
      if (pathParts.length === 4 && pathParts[2] === 'agents' && method === 'PUT') {
        const promptRef = pathParts[3];

        // Validate admin
        const { user, error: authError } = await validateAdmin(req, supabase);
        if (authError) {
          return new Response(JSON.stringify({ error: authError }), {
            status: user ? 403 : 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const requestBody = body || await req.json();

        // Get current config
        const { data: currentConfig, error: fetchError } = await supabase
          .from('agent_configs')
          .select('config')
          .eq('agent_key', agentKey)
          .single();

        if (fetchError || !currentConfig) {
          return new Response(JSON.stringify({ error: 'Swarm config not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const agents = currentConfig.config?.agents || [];
        const agentIndex = agents.findIndex((a: any) => a.promptRef === promptRef);

        if (agentIndex === -1) {
          return new Response(JSON.stringify({ error: `Agent with promptRef "${promptRef}" not found` }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Update agent
        const updatedAgents = [...agents];
        updatedAgents[agentIndex] = {
          ...updatedAgents[agentIndex],
          ...(requestBody.name !== undefined && { name: requestBody.name }),
          ...(requestBody.phase !== undefined && { phase: requestBody.phase }),
          ...(requestBody.order !== undefined && { order: requestBody.order }),
          ...(requestBody.enabled !== undefined && { enabled: requestBody.enabled }),
        };

        // Re-sort after update
        updatedAgents.sort((a: any, b: any) => {
          const phaseOrder = { pre: 1, main: 2, post: 3 };
          const phaseDiff = (phaseOrder[a.phase] || 99) - (phaseOrder[b.phase] || 99);
          return phaseDiff !== 0 ? phaseDiff : a.order - b.order;
        });

        const { data, error } = await supabase
          .from('agent_configs')
          .update({ 
            config: { ...currentConfig.config, agents: updatedAgents },
            updated_at: new Date().toISOString()
          })
          .eq('agent_key', agentKey)
          .select()
          .single();

        if (error) throw error;

        await logAdminAction(supabase, user.id, 'update_agent_in_swarm', `agent_configs:${agentKey}`, {
          promptRef,
          updates: requestBody,
        });

        return new Response(JSON.stringify({ ok: true, data, agent: updatedAgents[agentIndex] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Agent Config Validation
    if (path === '/agent-configs/validate') {
      if (method === 'POST') {
        const requestBody = body || await req.json();
        const { agent_key, config } = requestBody;

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

  } catch (error: any) {
    console.error('[swarm-admin-api] Unhandled exception:', error);
    const errorResponse = {
      ok: false,
      op: body?.op || 'unknown',
      error: 'request_failed',
      detail: error.message || String(error)
    };
    return new Response(
      JSON.stringify(errorResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
