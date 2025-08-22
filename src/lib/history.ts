import { getSupabase } from './supabase';

export type ChatThread = {
  id: string;               // uuid
  title: string;            // first user message trimmed (≤60 chars)
  updatedAt: number;        // Date.now()
  messages: Array<{ role:'user'|'assistant'|'system'; content:string }>;
};

const MAX_THREADS = 20;

function keyFor(userId: string | null) { 
  return `hipat:threads:${userId ?? 'anon'}`; 
}

export function listThreads(): ChatThread[] {
  // Try to get user but don't block if auth isn't available
  let userId: string | null = null;
  try {
    // Note: this is sync-safe since we're not awaiting
    userId = null; // For now, use anon key until we add async support
  } catch {
    // Ignore auth errors, use anon storage
  }
  
  try {
    const raw = localStorage.getItem(keyFor(userId));
    return raw ? JSON.parse(raw) as ChatThread[] : [];
  } catch { 
    return []; 
  }
}

export function getThread(id: string): ChatThread | null {
  return listThreads().find(t => t.id === id) ?? null;
}

export function upsertThread(next: ChatThread): void {
  const list = listThreads().filter(t => t.id !== next.id);
  list.unshift(next);
  const pruned = list.slice(0, MAX_THREADS);
  
  let userId: string | null = null;
  try {
    userId = null; // For now, use anon key until we add async support
  } catch {
    // Ignore auth errors, use anon storage
  }
  
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(pruned));
  } catch (e) {
    console.warn('Failed to save chat thread:', e);
  }
}

export function deleteThread(id: string): void {
  const list = listThreads().filter(t => t.id !== id);
  
  let userId: string | null = null;
  try {
    userId = null; // For now, use anon key until we add async support
  } catch {
    // Ignore auth errors, use anon storage
  }
  
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to delete chat thread:', e);
  }
}

export function makeTitleFrom(messages: ChatThread['messages']): string {
  const firstUser = messages.find(m => m.role === 'user')?.content?.trim() ?? 'New chat';
  return firstUser.length > 60 ? firstUser.slice(0, 57) + '…' : firstUser;
}

export function newThreadId(): string {
  return crypto?.randomUUID ? crypto.randomUUID() : String(Date.now());
}