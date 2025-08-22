import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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

  it('navigates to new chat when deleting current thread', async () => {
    const mockDeleteThread = vi.mocked(vi.importMock('../../../lib/history')).deleteThread;
    
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);
    
    let mockNavigate = vi.fn();
    
    // Create test component with navigation tracking
    const TestComponent = () => {
      const navigate = useNavigate();
      const location = useLocation();
      mockNavigate = navigate;
      
      return (
        <div>
          <InlineMenu />
          <div data-testid="current-path">{location.pathname}</div>
          <div data-testid="current-search">{location.search}</div>
        </div>
      );
    };
    
    render(
      <MemoryRouter initialEntries={['/chat?t=1']}>
        <Routes>
          <Route path="/chat" element={<TestComponent />} />
        </Routes>
      </MemoryRouter>
    );
    
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    
    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete chat/i });
      expect(deleteButtons.length).toBeGreaterThan(0);
      fireEvent.click(deleteButtons[0]); // Delete thread with id '1'
    });
    
    expect(mockDeleteThread).toHaveBeenCalledWith('1');
    expect(mockNavigate).toHaveBeenCalledWith('/chat?new=1');
    
    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('navigates to new chat when deleting current thread', async () => {
    const mockDeleteThread = vi.mocked(vi.importMock('../../../lib/history')).deleteThread;
    
    // Initially return one thread
    mockListThreads.mockReturnValue([
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);
    
    let navigatedTo = '';
    const TestComponent = () => {
      const navigate = useNavigate();
      const location = useLocation();
      
      // Track navigation calls
      React.useEffect(() => {
        const originalNavigate = navigate;
        // Override navigate to track calls
        (navigate as any) = (path: string) => {
          navigatedTo = path;
          return originalNavigate(path);
        };
      }, [navigate]);
      
      return (
        <div>
          <InlineMenu />
          <div data-testid="location">{location.pathname + location.search}</div>
        </div>
      );
    };
    
    render(
      <MemoryRouter initialEntries={['/chat?t=1']}>
        <Routes>
          <Route path="/chat" element={<TestComponent />} />
        </Routes>
      </MemoryRouter>
    );
    
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    
    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete chat/i });
      fireEvent.click(deleteButtons[0]); // Delete thread with id '1'
    });
    
    expect(mockDeleteThread).toHaveBeenCalledWith('1');
    expect(navigatedTo).toBe('/chat?new=1');
    
    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('refreshes recent chats on storage events', async () => {
    const mockListThreads = vi.mocked(vi.importMock('../../../lib/history')).listThreads;
    
    // Start with empty threads
    mockListThreads.mockReturnValue([]);
    
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    
    await waitFor(() => {
      expect(screen.getByText('No chat history yet')).toBeInTheDocument();
    });
    
    // Update mock to return new thread
    mockListThreads.mockReturnValue([
      { id: 'new-1', title: 'Storage Synced Thread', updatedAt: Date.now(), messages: [] }
    ]);
    
    // Dispatch storage event
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'hipat:threads:anon',
      newValue: JSON.stringify([
        { id: 'new-1', title: 'Storage Synced Thread', updatedAt: Date.now(), messages: [] }
      ])
    }));
    
    await waitFor(() => {
      expect(screen.getByText('Storage Synced Thread')).toBeInTheDocument();
      expect(screen.queryByText('Original Thread')).not.toBeInTheDocument();
    });
  });

  it('ensures all icon-only buttons have proper aria-labels', async () => {
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    
    await waitFor(() => {
      // Check that rename and delete buttons have aria-labels
      const renameButtons = screen.getAllByRole('button', { name: /rename chat/i });
      const deleteButtons = screen.getAllByRole('button', { name: /delete chat/i });
      const clearButton = screen.getByRole('button', { name: /clear all chats/i });
      
      expect(renameButtons.length).toBe(2);
      expect(deleteButtons.length).toBe(2);
      expect(clearButton).toBeInTheDocument();
    });
  });

  it('prevents action button clicks from triggering parent link navigation', async () => {
    const originalPrompt = window.prompt;
    const originalConfirm = window.confirm;
    window.prompt = vi.fn(() => null); // Cancel rename
    window.confirm = vi.fn(() => false); // Cancel delete
    
    let navigateCallCount = 0;
    const mockNavigate = vi.fn(() => { navigateCallCount++; });
    
    // Mock useNavigate and useLocation to track navigation calls
    vi.doMock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: () => ({ pathname: '/dashboard', search: '' })
      };
    });
    
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    
    await waitFor(() => {
      const renameButton = screen.getAllByRole('button', { name: /rename chat/i })[0];
      const deleteButton = screen.getAllByRole('button', { name: /delete chat/i })[0];
      
      const initialNavigateCount = navigateCallCount;
      
      // These should not trigger navigation
      fireEvent.click(renameButton);
      fireEvent.click(deleteButton);
      
      // Navigation count should not increase from action button clicks
      expect(navigateCallCount).toBe(initialNavigateCount);
    });
    
    // Restore
    window.prompt = originalPrompt;
    window.confirm = originalConfirm;
    vi.clearAllMocks();
  });

  it('returns focus to trigger button on close', async () => {
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    const triggerButton = screen.getByRole('button', { name: /open menu/i });
    
    // Open drawer
    fireEvent.click(triggerButton);
    expect(await screen.findByRole('dialog', { name: /menu/i })).toBeInTheDocument();
    
    // Close drawer with escape key
    fireEvent.keyDown(document, { key: 'Escape' });
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /menu/i })).not.toBeInTheDocument();
      expect(document.activeElement).toBe(triggerButton);
    });
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