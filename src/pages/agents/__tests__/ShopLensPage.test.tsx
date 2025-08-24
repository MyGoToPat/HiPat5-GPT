import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ShopLensPage from '../ShopLensPage';

// Mock the shoplens lib
vi.mock('../../../lib/shoplens', () => ({
  analyzeLabel: vi.fn(() => Promise.resolve({
    productName: 'Test Protein Powder',
    ingredients: [
      { name: 'Whey Protein', amount: 25, unit: 'g', riskLevel: 'low' },
      { name: 'Natural Flavors', riskLevel: 'low' }
    ],
    claims: [
      { text: 'Builds muscle', category: 'performance', credibility: 'verified' }
    ],
    verdict: 'safe',
    notes: ['High quality ingredients'],
    confidence: 0.9
  })),
  fetchUserFeedback: vi.fn(() => Promise.resolve([
    { source: 'TestSource', snippet: 'Great product', rating: 5, timestamp: new Date() }
  ])),
  getConfig: vi.fn(() => ({
    sensitivity: 70,
    banned: [],
    caution: ['artificial', 'synthetic'],
    intendedUse: 'performance',
    strictLabelMode: false,
    allowProprietaryBlends: true
  })),
  saveConfig: vi.fn()
}));

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

const mockAnalyzeLabel = vi.mocked(vi.importMock('../../../lib/shoplens')).analyzeLabel;

describe('ShopLensPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders page with proper labels and controls', () => {
    render(
      <MemoryRouter>
        <ShopLensPage />
      </MemoryRouter>
    );

    expect(screen.getByText('ShopLens Nutrition')).toBeInTheDocument();
    expect(screen.getByLabelText('Label Text')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analyze label/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /prompt controls/i })).toBeInTheDocument();
  });

  it('analyze button disabled until textarea has content', () => {
    render(
      <MemoryRouter>
        <ShopLensPage />
      </MemoryRouter>
    );

    const analyzeButton = screen.getByRole('button', { name: /analyze label/i });
    expect(analyzeButton).toBeDisabled();

    const textarea = screen.getByLabelText('Label Text');
    fireEvent.change(textarea, { target: { value: 'Test label text' } });
    
    expect(analyzeButton).not.toBeDisabled();
  });

  it('renders analysis results after clicking analyze', async () => {
    render(
      <MemoryRouter>
        <ShopLensPage />
      </MemoryRouter>
    );

    const textarea = screen.getByLabelText('Label Text');
    fireEvent.change(textarea, { target: { value: 'Whey Protein Isolate, Natural Flavors' } });

    const analyzeButton = screen.getByRole('button', { name: /analyze label/i });
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('Test Protein Powder')).toBeInTheDocument();
      expect(screen.getByText('Ingredients (2)')).toBeInTheDocument();
      expect(screen.getByText('Whey Protein')).toBeInTheDocument();
      expect(screen.getByText('Safe')).toBeInTheDocument();
    });
  });

  it('displays image preview after upload', () => {
    render(
      <MemoryRouter>
        <ShopLensPage />
      </MemoryRouter>
    );

    const fileInput = screen.getByLabelText(/upload supplement label/i);
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    // Mock URL.createObjectURL
    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:test-url');

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByAltText('Supplement label preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove image/i })).toBeInTheDocument();

    // Restore
    URL.createObjectURL = originalCreateObjectURL;
  });

  it('shows loading state during analysis', async () => {
    render(
      <MemoryRouter>
        <ShopLensPage />
      </MemoryRouter>
    );

    const textarea = screen.getByLabelText('Label Text');
    fireEvent.change(textarea, { target: { value: 'Test content' } });

    const analyzeButton = screen.getByRole('button', { name: /analyze label/i });
    fireEvent.click(analyzeButton);

    expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    expect(analyzeButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.queryByText('Analyzing...')).not.toBeInTheDocument();
    });
  });

  it('prompt controls panel toggles visibility', () => {
    render(
      <MemoryRouter>
        <ShopLensPage />
      </MemoryRouter>
    );

    const controlsButton = screen.getByRole('button', { name: /prompt controls/i });
    
    // Initially collapsed
    expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText(/sensitivity/i)).not.toBeInTheDocument();

    // Expand
    fireEvent.click(controlsButton);
    expect(controlsButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText(/sensitivity/i)).toBeInTheDocument();

    // Collapse
    fireEvent.click(controlsButton);
    expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('banned ingredient via controls results in avoid verdict', async () => {
    // Mock analyzeLabel to return 'avoid' when yohimbine is banned
    mockAnalyzeLabel.mockResolvedValueOnce({
      productName: 'Banned Product',
      ingredients: [
        { name: 'Yohimbine HCl', riskLevel: 'high', notes: 'Stimulant - may cause side effects' }
      ],
      claims: [],
      verdict: 'avoid',
      notes: ['Banned ingredients detected: Yohimbine HCl'],
      confidence: 0.85
    });

    render(
      <MemoryRouter>
        <ShopLensPage />
      </MemoryRouter>
    );

    // Open prompt controls
    fireEvent.click(screen.getByRole('button', { name: /prompt controls/i }));

    // Set banned ingredients
    const bannedInput = screen.getByLabelText(/banned ingredients/i);
    fireEvent.change(bannedInput, { target: { value: 'yohimbine' } });

    // Enter text and analyze
    const textarea = screen.getByLabelText('Label Text');
    fireEvent.change(textarea, { target: { value: 'Test product with yohimbine' } });

    const analyzeButton = screen.getByRole('button', { name: /analyze label/i });
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('Avoid')).toBeInTheDocument();
    });
  });

  it('strict mode with proprietary blend results in caution verdict', async () => {
    // Mock analyzeLabel to return 'caution' for strict mode + proprietary blend
    mockAnalyzeLabel.mockResolvedValueOnce({
      productName: 'Strict Mode Product',
      ingredients: [
        { name: 'Proprietary Blend', amount: 500, unit: 'mg', riskLevel: 'medium' }
      ],
      claims: [],
      verdict: 'caution',
      notes: ['Proprietary blend detected in strict mode'],
      confidence: 0.85
    });

    render(
      <MemoryRouter>
        <ShopLensPage />
      </MemoryRouter>
    );

    // Open prompt controls
    fireEvent.click(screen.getByRole('button', { name: /prompt controls/i }));

    // Enable strict mode
    const strictModeToggle = screen.getByRole('button', { name: /toggle strict label mode/i });
    fireEvent.click(strictModeToggle);

    // Disable proprietary blends
    const proprietaryToggle = screen.getByRole('button', { name: /toggle allow proprietary blends/i });
    fireEvent.click(proprietaryToggle);

    // Enter text and analyze
    const textarea = screen.getByLabelText('Label Text');
    fireEvent.change(textarea, { target: { value: 'Test product with proprietary blend' } });

    const analyzeButton = screen.getByRole('button', { name: /analyze label/i });
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('Use Caution')).toBeInTheDocument();
    });
  });

  it('reset to defaults restores safe verdict', async () => {
    // Mock analyzeLabel to return 'safe' for default config
    mockAnalyzeLabel.mockResolvedValueOnce({
      productName: 'Default Product',
      ingredients: [
        { name: 'Whey Protein', riskLevel: 'low' }
      ],
      claims: [],
      verdict: 'safe',
      notes: ['No concerning ingredients or patterns detected'],
      confidence: 0.85
    });

    render(
      <MemoryRouter>
        <ShopLensPage />
      </MemoryRouter>
    );

    // Open prompt controls
    fireEvent.click(screen.getByRole('button', { name: /prompt controls/i }));

    // Reset to defaults
    const resetButton = screen.getByRole('button', { name: /reset to defaults/i });
    fireEvent.click(resetButton);

    // Enter text and analyze
    const textarea = screen.getByLabelText('Label Text');
    fireEvent.change(textarea, { target: { value: 'Simple whey protein' } });

    const analyzeButton = screen.getByRole('button', { name: /analyze label/i });
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('Safe')).toBeInTheDocument();
    });
  });

  it('displays configuration JSON preview', () => {
    render(
      <MemoryRouter>
        <ShopLensPage />
      </MemoryRouter>
    );

    // Open prompt controls
    fireEvent.click(screen.getByRole('button', { name: /prompt controls/i }));

    // Check JSON preview is visible
    expect(screen.getByText('Current Configuration')).toBeInTheDocument();
    expect(screen.getByText(/"sensitivity": 70/)).toBeInTheDocument();
  });

  it('sensitivity slider updates config', () => {
    render(
      <MemoryRouter>
        <ShopLensPage />
      </MemoryRouter>
    );

    // Open prompt controls
    fireEvent.click(screen.getByRole('button', { name: /prompt controls/i }));

    const sensitivitySlider = screen.getByLabelText(/sensitivity/i);
    fireEvent.change(sensitivitySlider, { target: { value: '90' } });

    // Check the label updates
    expect(screen.getByText('Sensitivity: 90%')).toBeInTheDocument();
  });
});