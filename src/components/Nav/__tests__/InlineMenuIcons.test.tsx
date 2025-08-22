import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import InlineMenu from '../InlineMenu';

describe('InlineMenu icons', () => {
  it('renders lucide icons at expected size', async () => {
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    // Grab first few menu links and assert each contains an SVG
    const links = await screen.findAllByRole('link');
    for (const link of links.slice(0, 5)) {
      const svg = link.querySelector('svg');
      expect(svg).toBeTruthy();
      // lucide sets width/height on svg; allow string or number
      if (svg) {
        const w = svg.getAttribute('width');
        const h = svg.getAttribute('height');
        expect(['16','16px',null].includes(w)).toBe(true);
        expect(['16','16px',null].includes(h)).toBe(true);
      }
    }
  });

  it('renders icon wrapper containers correctly', async () => {
    render(<MemoryRouter><InlineMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    const links = await screen.findAllByRole('link');
    // Check that each link has the icon wrapper span
    for (const link of links.slice(0, 3)) {
      const iconWrapper = link.querySelector('span');
      expect(iconWrapper).toBeTruthy();
    }
  });
});