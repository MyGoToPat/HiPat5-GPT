import { getSupabase } from './supabase';
import type { MemoryRow } from '../types/swarm';

export interface MemoryQuery {
  userId: string;
  topics?: string[];
  tier?: 'ephemeral' | 'short_term' | 'long_term';
  minConfidence?: number;
  limit?: number;
}

export interface MemoryCreateInput {
  user_id: string;
  tier: 'ephemeral' | 'short_term' | 'long_term';
  key: string;
  value: any;
  source: 'explicit' | 'inferred' | 'system';
  confidence?: number;
  ttl?: string;
  topics?: string[];
  is_pii?: boolean;
}

export class MemoryService {
  static async create(input: MemoryCreateInput): Promise<MemoryRow | null> {
    const supabase = getSupabase();

    const conflict_priority = input.source === 'explicit' ? 2 : input.source === 'inferred' ? 1 : 0;

    const { data, error } = await supabase
      .from('user_memory')
      .insert({
        user_id: input.user_id,
        tier: input.tier,
        key: input.key,
        value: input.value,
        source: input.source,
        confidence: input.confidence ?? 1.0,
        ttl: input.ttl || null,
        topics: input.topics || [],
        is_pii: input.is_pii || false,
        conflict_priority
      })
      .select()
      .single();

    if (error) {
      console.error('[memory-create-failed]', error);
      return null;
    }

    return data as MemoryRow;
  }

  static async upsertWithConflictResolution(
    userId: string,
    key: string,
    value: any,
    source: 'explicit' | 'inferred' | 'system',
    confidence: number = 1.0
  ): Promise<string | null> {
    const supabase = getSupabase();

    const { data, error } = await supabase.rpc('resolve_memory_conflict', {
      p_user_id: userId,
      p_key: key,
      p_new_value: value,
      p_source: source,
      p_confidence: confidence
    });

    if (error) {
      console.error('[memory-upsert-failed]', error);
      return null;
    }

    return data as string;
  }

  static async query(query: MemoryQuery): Promise<MemoryRow[]> {
    const supabase = getSupabase();

    let queryBuilder = supabase
      .from('user_memory')
      .select('*')
      .eq('user_id', query.userId);

    if (query.tier) {
      queryBuilder = queryBuilder.eq('tier', query.tier);
    }

    if (query.minConfidence !== undefined) {
      queryBuilder = queryBuilder.gte('confidence', query.minConfidence);
    }

    if (query.topics && query.topics.length > 0) {
      queryBuilder = queryBuilder.overlaps('topics', query.topics);
    }

    queryBuilder = queryBuilder
      .order('conflict_priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(query.limit || 20);

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('[memory-query-failed]', error);
      return [];
    }

    return data as MemoryRow[];
  }

  static async getByKey(userId: string, key: string): Promise<MemoryRow | null> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('user_memory')
      .select('*')
      .eq('user_id', userId)
      .eq('key', key)
      .order('conflict_priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[memory-get-failed]', error);
      return null;
    }

    return data as MemoryRow | null;
  }

  static async update(
    memoryId: string,
    updates: Partial<Pick<MemoryRow, 'value' | 'confidence' | 'topics' | 'tier'>>
  ): Promise<boolean> {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('user_memory')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', memoryId);

    if (error) {
      console.error('[memory-update-failed]', error);
      return false;
    }

    return true;
  }

  static async delete(memoryId: string): Promise<boolean> {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('user_memory')
      .delete()
      .eq('id', memoryId);

    if (error) {
      console.error('[memory-delete-failed]', error);
      return false;
    }

    return true;
  }

  static async deleteAllForUser(userId: string): Promise<boolean> {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('user_memory')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('[memory-delete-all-failed]', error);
      return false;
    }

    return true;
  }

  static async promoteToLongTerm(memoryId: string): Promise<boolean> {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('user_memory')
      .update({
        tier: 'long_term',
        confidence: 1.0,
        ttl: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', memoryId);

    if (error) {
      console.error('[memory-promote-failed]', error);
      return false;
    }

    return true;
  }

  static async exportForUser(userId: string): Promise<MemoryRow[]> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('user_memory')
      .select('*')
      .eq('user_id', userId)
      .order('tier', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[memory-export-failed]', error);
      return [];
    }

    return data as MemoryRow[];
  }

  static async retrieveRelevant(
    userId: string,
    currentTopics: string[],
    limit: number = 5
  ): Promise<MemoryRow[]> {
    const memories = await this.query({
      userId,
      topics: currentTopics,
      minConfidence: 0.3,
      limit: limit * 2
    });

    const scored = memories.map(mem => ({
      memory: mem,
      score: this.calculateRelevanceScore(mem, currentTopics)
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(s => s.memory);
  }

  private static calculateRelevanceScore(memory: MemoryRow, currentTopics: string[]): number {
    const topicMatch = memory.topics.filter(t => currentTopics.includes(t)).length;
    const topicScore = topicMatch / Math.max(currentTopics.length, 1);

    const ageInDays = (Date.now() - new Date(memory.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - ageInDays / 30);

    const tierScore = memory.tier === 'long_term' ? 1.0 : memory.tier === 'short_term' ? 0.7 : 0.4;

    return (
      topicScore * 0.4 +
      recencyScore * 0.3 +
      memory.confidence * 0.2 +
      tierScore * 0.1
    );
  }
}
