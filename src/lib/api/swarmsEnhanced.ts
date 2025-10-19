import { supabase } from '../supabase';

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/swarm-admin-api`;

// Get auth headers with user JWT for admin validation
async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token || '';
  return {
    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

// Agent Prompts API
export async function createPromptDraft(payload: {
  agent_key: string;
  model: string;
  prompt: string;
  title?: string;
}) {
  const res = await fetch(`${API_BASE}/agent-prompts`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create prompt draft');
  }

  return res.json();
}

export async function publishPrompt(id: string) {
  const res = await fetch(`${API_BASE}/agent-prompts/${id}/publish`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to publish prompt');
  }

  return res.json();
}

// Swarm Versions API
export async function createSwarmDraftVersion(swarmId: string, manifest: any) {
  const res = await fetch(`${API_BASE}/swarms/${swarmId}/versions`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ manifest }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create swarm draft version');
  }

  return res.json();
}

export async function publishSwarmVersion(id: string) {
  const res = await fetch(`${API_BASE}/swarm-versions/${id}/publish`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to publish swarm version');
  }

  return res.json();
}

export async function updateRollout(
  id: string,
  payload: {
    rollout_percent?: number;
    cohort?: 'beta' | 'paid' | 'all';
  }
) {
  const res = await fetch(`${API_BASE}/swarm-versions/${id}/rollout`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update rollout');
  }

  return res.json();
}
