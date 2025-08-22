import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InlineMenu from '../InlineMenu';

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
});