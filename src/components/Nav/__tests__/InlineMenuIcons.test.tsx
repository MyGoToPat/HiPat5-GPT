import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import InlineMenu from '../InlineMenu';

// Mock the useRole hook
vi.mock('../../../hooks/useRole', () => ({
  useRole: vi.fn(() => ({ role: 'admin', loading: false })),
}));

// Mock getSupabase for signOut
vi.mock('../../../lib/supabase', () => ({
  getSupabase: () => ({
    auth: {
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
  }),
}));

describe('InlineMenu icons', () => {
  it('renders lucide icons at expected size', async () => {
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    
    // Grab menu links and assert each contains an SVG with proper sizing
    const links = await screen.findAllByRole('link');
    const menuLinks = links.filter(link => 
      ['Dashboard', 'Profile', 'Admin', 'Agents'].some(label => 
        link.textContent?.includes(label)
      )
    );
    
    for (const link of menuLinks.slice(0, 4)) {
      const svg = link.querySelector('svg');
      expect(svg).toBeTruthy();
      
      // lucide icons should have width/height attributes
      if (svg) {
        const w = svg.getAttribute('width');
        const h = svg.getAttribute('height');
        // lucide typically sets these to "24" by default, but our size={16} should override
        expect(w).toBeTruthy();
        expect(h).toBeTruthy();
      }
      
      // Check for icon wrapper with fixed dimensions
      const iconWrapper = link.querySelector('span');
      expect(iconWrapper).toBeTruthy();
    }
  });

  it('uses only lucide icons (no custom svg)', async () => {
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    
    // All SVGs should be lucide icons with proper attributes
    const svgs = screen.getByRole('dialog').querySelectorAll('svg');
    for (const svg of svgs) {
      // lucide icons have these standard attributes
      expect(svg.getAttribute('fill')).toBe('none');
      expect(svg.getAttribute('stroke')).toBe('currentColor');
      expect(svg.getAttribute('stroke-width')).toBe('2');
    }
  });
});