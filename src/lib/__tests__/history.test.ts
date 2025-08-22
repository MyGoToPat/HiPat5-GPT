import { describe, it, expect, beforeEach } from 'vitest';
import { listThreads, upsertThread, getThread, deleteThread, renameThread, clearThreads, makeTitleFrom, newThreadId, type ChatThread } from '../history';

// Mock localStorage for tests
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem(key: string) {
    return this.store[key] || null;
  },
  setItem(key: string, value: string) {
    this.store[key] = value;
  },
  removeItem(key: string) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

describe('history', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('upserts and lists with newest first, pruning to 20', () => {
    // Create 25 threads to test pruning
    for (let i = 0; i < 25; i++) {
      const id = String(i);
      const thread: ChatThread = {
        id,
        title: `T${i}`,
        updatedAt: i,
        messages: [{ role: 'user', content: `msg ${i}` }]
      };
      upsertThread(thread);
    }
    
    const list = listThreads();
    expect(list.length).toBe(20);
    expect(list[0].title).toBe('T24'); // Newest first
  });

  it('get/delete works', () => {
    const id = newThreadId();
    const thread: ChatThread = {
      id,
      title: 'Hello',
      updatedAt: Date.now(),
      messages: [{ role: 'user', content: 'hi' }]
    };
    
    upsertThread(thread);
    expect(getThread(id)?.title).toBe('Hello');
    
    deleteThread(id);
    expect(getThread(id)).toBeNull();
  });

  it('makeTitleFrom trims long messages', () => {
    const longMessage = 'a'.repeat(70);
    const messages: ChatThread['messages'] = [{ role: 'user', content: longMessage }];
    const title = makeTitleFrom(messages);
    
    expect(title.endsWith('…')).toBe(true);
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it('makeTitleFrom finds first user message', () => {
    const messages: ChatThread['messages'] = [
      { role: 'assistant', content: 'Hi there!' },
      { role: 'user', content: 'Hello Pat' },
      { role: 'assistant', content: 'How can I help?' }
    ];
    const title = makeTitleFrom(messages);
    
    expect(title).toBe('Hello Pat');
  });

  it('makeTitleFrom fallback for no user messages', () => {
    const messages: ChatThread['messages'] = [
      { role: 'assistant', content: 'Hi there!' }
    ];
    const title = makeTitleFrom(messages);
    
    expect(title).toBe('New chat');
  });

  it('handles localStorage errors gracefully', () => {
    // Mock localStorage to throw
    const originalSetItem = localStorage.setItem;
    const originalConsoleWarn = console.warn;
    console.warn = () => {}; // Mock console.warn to prevent test runner from capturing it
    localStorage.setItem = () => { throw new Error('Storage full'); };
    
    // Should not throw
    expect(() => {
      upsertThread({
        id: 'test',
        title: 'Test',
        updatedAt: Date.now(),
        messages: []
      });
    }).not.toThrow();
    
    // Restore
    localStorage.setItem = originalSetItem;
    console.warn = originalConsoleWarn;
  });

  it('newThreadId generates unique IDs', () => {
    const id1 = newThreadId();
    const id2 = newThreadId();
    
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it('renameThread changes title and updatedAt', () => {
    const id = newThreadId();
    const originalTime = Date.now() - 1000;
    upsertThread({
      id,
      title: 'Original Title',
      updatedAt: originalTime,
      messages: [{ role: 'user', content: 'test' }]
    });
    
    renameThread(id, 'New Title');
    
    const thread = getThread(id);
    expect(thread?.title).toBe('New Title');
    expect(thread?.updatedAt).toBeGreaterThan(originalTime);
  });

  it('renameThread preserves title if empty string provided', () => {
    const id = newThreadId();
    upsertThread({
      id,
      title: 'Original Title',
      updatedAt: Date.now(),
      messages: [{ role: 'user', content: 'test' }]
    });
    
    renameThread(id, '   ');
    
    const thread = getThread(id);
    expect(thread?.title).toBe('Original Title');
  });

  it('clearThreads removes all threads', () => {
    // Add some threads
    for (let i = 0; i < 3; i++) {
      upsertThread({
        id: String(i),
        title: `Thread ${i}`,
        updatedAt: Date.now(),
        messages: [{ role: 'user', content: `msg ${i}` }]
      });
    }
    
    expect(listThreads().length).toBe(3);
    
    clearThreads();
    
    expect(listThreads().length).toBe(0);
  });
});