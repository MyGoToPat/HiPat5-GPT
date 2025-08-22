import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InlineMenu from '../InlineMenu';

// Mock the history module
vi.mock('../../../lib/history', () => ({
  listThreads: vi.fn(() => [
    { id: '1', title: 'Test Chat 1', updatedAt: Date.now(), messages: [] },
    { id: '2', title: 'Test Chat 2', updatedAt: Date.now() - 1000, messages: [] }
  ]),
  deleteThread: vi.fn(),
  renameThread: vi.fn(),
  clearThreads: vi.fn()
}));

// Mock the useRole hook
vi.mock('../../../hooks/useRole', () => ({
  useRole: vi.fn(() => ({ role: 'user', loading: false })),
}));

// Mock getSupabase for signOut
vi.mock('../../../lib/supabase', () => ({
  getSupabase: () => ({
    auth: {
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
  }),
}));

const mockUseRole = vi.mocked(vi.importMock('../../../hooks/useRole')).useRole;

describe('InlineMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRole.mockReturnValue({ role: 'user', loading: false });
  });

  it('renders the menu button', () => {
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
  });

  it('opens and closes with button clicks', async () => {
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    
    // Open
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    expect(await screen.findByRole('dialog', { name: /menu/i })).toBeInTheDocument();
    
    // Close with close button
    fireEvent.click(screen.getByRole('button', { name: /close menu/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /menu/i })).not.toBeInTheDocument();
    });
  });

  it('closes on escape key', async () => {
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    expect(await screen.findByRole('dialog', { name: /menu/i })).toBeInTheDocument();
    
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /menu/i })).not.toBeInTheDocument();
    });
  });

  it('closes on outside click', async () => {
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    expect(await screen.findByRole('dialog', { name: /menu/i })).toBeInTheDocument();
    
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /menu/i })).not.toBeInTheDocument();
    });
  });

  it('hides admin-only links for user role', async () => {
    mockUseRole.mockReturnValue({ role: 'user', loading: false });
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
      expect(screen.queryByText('Agents')).not.toBeInTheDocument();
      expect(screen.queryByText('Debug')).not.toBeInTheDocument();
      expect(screen.queryByText('Client Management')).not.toBeInTheDocument();
    });
  });

  it('shows admin links when role is admin', async () => {
    mockUseRole.mockReturnValue({ role: 'admin', loading: false });
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Agents')).toBeInTheDocument();
      expect(screen.getByText('Debug')).toBeInTheDocument();
      expect(screen.getByText('Client Management')).toBeInTheDocument();
    });
  });

  it('shows trainer links when role is trainer', async () => {
    mockUseRole.mockReturnValue({ role: 'trainer', loading: false });
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Client Management')).toBeInTheDocument();
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
      expect(screen.queryByText('Agents')).not.toBeInTheDocument();
      expect(screen.queryByText('Debug')).not.toBeInTheDocument();
    });
  });

  it('closes menu when navigation link is clicked', async () => {
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    expect(await screen.findByRole('dialog', { name: /menu/i })).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Dashboard'));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /menu/i })).not.toBeInTheDocument();
    });
  });

  it('locks body scroll on open and restores on close', async () => {
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;
    
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    const trigger = screen.getByRole('button', { name: /open menu/i });
    
    // Open menu
    fireEvent.click(trigger);
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.width).toBe('100%');
    
    // Close menu
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(document.body.style.overflow).toBe(prevOverflow);
      expect(document.body.style.position).toBe(prevPosition);
      expect(document.body.style.top).toBe(prevTop);
      expect(document.body.style.width).toBe(prevWidth);
    });
  });

  it('manages focus correctly on open and close', async () => {
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    const trigger = screen.getByRole('button', { name: /open menu/i });
    
    // Open menu
    fireEvent.click(trigger);
    await waitFor(() => {
      const firstTabbable = screen.getAllByRole('link')[0];
      expect(document.activeElement).toBe(firstTabbable);
    });
    
    // Close menu
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });

  it('marks active route with aria-current="page"', async () => {
    render(<MemoryRouter initialEntries={['/profile']}><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    
    await waitFor(() => {
      const profileLink = screen.getByRole('link', { name: /Profile/i });
      expect(profileLink).toHaveAttribute('aria-current', 'page');
    });
  });

  it('displays recent chats when available', async () => {
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Test Chat 1')).toBeInTheDocument();
      expect(screen.getByText('Test Chat 2')).toBeInTheDocument();
    });
  });

  it('shows placeholder when no chat history exists', async () => {
    // Mock empty history
    const mockListThreads = vi.mocked(vi.importMock('../../../lib/history')).listThreads;
    mockListThreads.mockReturnValue([]);
    
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    
    await waitFor(() => {
      expect(screen.getByText('No chat history yet')).toBeInTheDocument();
    });
  });

  it('displays rename and delete buttons for each chat', async () => {
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /rename chat/i })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: /delete chat/i })).toHaveLength(2);
    });
  });

  it('displays clear all button when chats exist', async () => {
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear all chats/i })).toBeInTheDocument();
    });
  });

  it('handles rename thread action', async () => {
    const mockRenameThread = vi.mocked(vi.importMock('../../../lib/history')).renameThread;
    
    // Mock window.prompt
    const originalPrompt = window.prompt;
    window.prompt = vi.fn(() => 'New Chat Title');
    
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    
    await waitFor(() => {
      const renameButtons = screen.getAllByRole('button', { name: /rename chat/i });
      fireEvent.click(renameButtons[0]);
    });
    
    expect(mockRenameThread).toHaveBeenCalledWith('1', 'New Chat Title');
    
    // Restore original prompt
    window.prompt = originalPrompt;
  });

  it('handles delete thread action', async () => {
    const mockDeleteThread = vi.mocked(vi.importMock('../../../lib/history')).deleteThread;
    
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);
    
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    
    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete chat/i });
      fireEvent.click(deleteButtons[0]);
    });
    
    expect(mockDeleteThread).toHaveBeenCalledWith('1');
    
    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('handles clear all threads action', async () => {
    const mockClearThreads = vi.mocked(vi.importMock('../../../lib/history')).clearThreads;
    
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);
    
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    
    await waitFor(() => {
      const clearButton = screen.getByRole('button', { name: /clear all chats/i });
      fireEvent.click(clearButton);
    });
    
    expect(mockClearThreads).toHaveBeenCalled();
    
    // Restore original confirm
    window.confirm = originalConfirm;
  });
});