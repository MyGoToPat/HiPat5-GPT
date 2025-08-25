import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { vi } from 'vitest';
import AgentsListPage from '../AgentsListPage';

// Mock the feature flags
vi.mock('../../../config/featureFlags', () => ({
  FEATURE_SHOPLENS: true,
  parseBool: vi.fn((v, fallback = true) => {
    if (typeof v === 'boolean') return v;
    if (typeof v !== 'string') return fallback;
    const s = v.toLowerCase().trim();
    return s === '' ? fallback : !['0','false','off','no'].includes(s);
  })
}));

// Mock useRole hook
vi.mock('../../../hooks/useRole', () => ({
  useRole: vi.fn(() => ({ role: 'user', loading: false }))
}));

const mockFeatureFlags = vi.mocked(vi.importMock('../../../config/featureFlags'));

describe('AgentsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFeatureFlags.FEATURE_SHOPLENS = true;
  });

  it('renders ShopLens card when flag enabled', () => {
    render(
      <MemoryRouter>
        <AgentsListPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('main', { name: /agents/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Agents' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'ShopLens Nutrition' })).toBeInTheDocument();
    expect(screen.getByText('ShopLens Nutrition')).toBeInTheDocument();
    expect(screen.getByText('Analyze supplement labels (deterministic stub).')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open shoplens nutrition/i })).toBeInTheDocument();
  });

  it('navigates to /agents/shoplens when Open clicked', () => {
    let currentPath = '/agents';
    
    const TestComponent = () => {
      const navigate = useNavigate();
      const location = useLocation();
      currentPath = location.pathname;
      return <AgentsListPage />;
    };

    render(
      <MemoryRouter initialEntries={['/agents']}>
        <Routes>
          <Route path="/agents" element={<TestComponent />} />
          <Route path="/agents/shoplens" element={<div>ShopLens Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    const openButton = screen.getByRole('link', { name: /open shoplens nutrition/i });
    expect(openButton).toHaveAttribute('href', '/agents/shoplens');
  });

  it('hides ShopLens card and shows empty state when flag disabled', () => {
    mockFeatureFlags.FEATURE_SHOPLENS = false;

    render(
      <MemoryRouter>
        <AgentsListPage />
      </MemoryRouter>
    );

    expect(screen.queryByRole('article', { name: 'ShopLens Nutrition' })).not.toBeInTheDocument();
    expect(screen.queryByText('ShopLens Nutrition')).not.toBeInTheDocument();
    
    // Check empty state
    expect(screen.getByText('No agents available')).toBeInTheDocument();
    expect(screen.getByText(/check back soon or enable features/i)).toBeInTheDocument();
  });

  it('docs button present, disabled, and a11y-described', () => {
    render(
      <MemoryRouter>
        <AgentsListPage />
      </MemoryRouter>
    );

    const docsButton = screen.getByRole('button', { name: /documentation for shoplens nutrition/i });
    expect(docsButton).toBeDisabled();
    expect(docsButton).toHaveAttribute('aria-describedby', 'docs-tip');
    
    // Check tooltip text is present
    const tooltip = screen.getByText('Coming soon');
    expect(tooltip).toHaveClass('sr-only');
    expect(tooltip).toHaveAttribute('id', 'docs-tip');
  });

  it('page uses semantic landmarks and headings', () => {
    render(
      <MemoryRouter>
        <AgentsListPage />
      </MemoryRouter>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('aria-labelledby', 'agents-h1');
    
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveAttribute('id', 'agents-h1');
    expect(heading).toHaveTextContent('Agents');
  });
});