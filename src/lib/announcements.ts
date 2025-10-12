import { supabase } from './supabase';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: 'beta' | 'all';
  created_at: string;
}

export interface AnnouncementWithReadStatus extends Announcement {
  is_read: boolean;
  read_at?: string;
}

export async function getAnnouncements(userId: string): Promise<AnnouncementWithReadStatus[]> {
  const { data: announcements, error: annError } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (annError) {
    console.error('[announcements] Error fetching announcements:', annError);
    return [];
  }

  const { data: reads, error: readsError } = await supabase
    .from('announcement_reads')
    .select('announcement_id, read_at')
    .eq('user_id', userId);

  if (readsError) {
    console.error('[announcements] Error fetching reads:', readsError);
  }

  const readMap = new Map((reads || []).map(r => [r.announcement_id, r.read_at]));

  return (announcements || []).map(a => ({
    ...a,
    is_read: readMap.has(a.id),
    read_at: readMap.get(a.id)
  }));
}

export async function markAnnouncementRead(userId: string, announcementId: string): Promise<void> {
  const { error } = await supabase
    .from('announcement_reads')
    .insert({
      user_id: userId,
      announcement_id: announcementId,
      read_at: new Date().toISOString()
    });

  if (error && !error.message.includes('duplicate')) {
    console.error('[announcements] Error marking read:', error);
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  const announcements = await getAnnouncements(userId);
  return announcements.filter(a => !a.is_read).length;
}

export async function createAnnouncement(
  title: string,
  body: string,
  audience: 'beta' | 'all'
): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      title,
      body,
      audience,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create announcement: ${error.message}`);
  }

  return data;
}
