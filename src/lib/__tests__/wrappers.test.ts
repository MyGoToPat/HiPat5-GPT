import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client and getSupabase
vi.mock('../supabase', () => {
  const invoke = vi.fn();
  return {
    getSupabase: () => ({ functions: { invoke } }),
    __invoke: invoke
  };
});

import { __invoke as invokeMock } from '../supabase';
import { callChat, type ChatMessage } from '../chat';
import { fetchFoodMacros } from '../food';

describe('wrappers contract', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('callChat returns { ok, content } on success and never throws', async () => {
    invokeMock.mockResolvedValue({ data: { content: 'pong' }, error: null });
    const res = await callChat([{ role: 'user', content: 'ping' } as ChatMessage]);
    expect(res.ok).toBe(true);
    expect(res.content).toBe('pong');
  });

  it('callChat returns { ok:false, error } on failure', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const res = await callChat([{ role: 'user', content: 'x' } as ChatMessage]);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('boom');
  });

  it('fetchFoodMacros maps kcal to calories and returns { ok, macros }', async () => {
    invokeMock.mockResolvedValue({ data: { kcal: 100, protein_g: 3, carbs_g: 20, fat_g: 1, confidence: 0.9 }, error: null });
    const res = await fetchFoodMacros('banana');
    expect(res.ok).toBe(true);
    expect(res.macros).toEqual({ calories: 100, protein_g: 3, carbs_g: 20, fat_g: 1, confidence: 0.9 });
  });

  it('fetchFoodMacros returns { ok:false, error } when missing data', async () => {
    invokeMock.mockResolvedValue({ data: null, error: null });
    const res = await fetchFoodMacros('banana');
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });
});