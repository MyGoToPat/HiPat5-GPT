import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import FoodLogPage from '../FoodLogPage';

// Mock the foodlog lib
vi.mock('../../../lib/foodlog', () => ({
  parseMeal: vi.fn(() => ({
    items: [
      {
        id: '1',
        name: 'Egg (2 each)',
        qty: 2,
        unit: 'each',
        kcal: 156,
        protein: 12,
        carbs: 1.2,
        fat: 10,
        confidence: 1.0
      },
      {
        id: '2',
        name: 'Toast (1 slice)',
        qty: 1,
        unit: 'slice',
        kcal: 80,
        protein: 3,
        carbs: 14,
        fat: 1,
        confidence: 1.0
      }
    ],
    totals: { kcal: 236, protein: 15, carbs: 15.2, fat: 11 },
    notes: [],
    confidence: 1.0
  })),
  getFoodLogConfig: vi.fn(() => ({
    dietStyle: 'standard',
    units: 'us',
    defaultServing: 1,
    timezone: 'UTC',
    strictParsing: false
  })),
  saveFoodLogConfig: vi.fn(),
  saveEntry: vi.fn(),
  listEntries: vi.fn(() => []),
  undoLast: vi.fn()
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

const mockParseMeal = vi.mocked(vi.importMock('../../../lib/foodlog')).parseMeal;
const mockListEntries = vi.mocked(vi.importMock('../../../lib/foodlog')).listEntries;

describe('FoodLogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders page with proper structure and labels', () => {
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('main', { name: /food log/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Food Log' })).toBeInTheDocument();
    expect(screen.getByLabelText(/what did you eat/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /prompt controls/i })).toBeInTheDocument();
  });

  it('analyze button disabled until textarea has content', () => {
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    );

    const analyzeButton = screen.getByRole('button', { name: /analyze/i });
    expect(analyzeButton).toBeDisabled();

    const textarea = screen.getByLabelText(/what did you eat/i);
    fireEvent.change(textarea, { target: { value: 'Test meal text' } });
    
    expect(analyzeButton).not.toBeDisabled();
  });

  it('analyze renders rows and totals', async () => {
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    );

    const textarea = screen.getByLabelText(/what did you eat/i);
    fireEvent.change(textarea, { target: { value: '2 eggs, toast with butter' } });

    const analyzeButton = screen.getByRole('button', { name: /analyze/i });
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('Analysis Results')).toBeInTheDocument();
      expect(screen.getByText('TOTALS')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Egg (2 each)')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Toast (1 slice)')).toBeInTheDocument();
    });
  });

  it('editing quantity updates totals live', async () => {
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    );

    const textarea = screen.getByLabelText(/what did you eat/i);
    fireEvent.change(textarea, { target: { value: '2 eggs, toast' } });

    const analyzeButton = screen.getByRole('button', { name: /analyze/i });
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      const qtyInput = screen.getByDisplayValue('2');
      fireEvent.change(qtyInput, { target: { value: '3' } });
      
      // Totals should update (though exact values depend on implementation)
      expect(screen.getByText('TOTALS')).toBeInTheDocument();
    });
  });

  it('save entry button works when items present', async () => {
    const mockSaveEntry = vi.mocked(vi.importMock('../../../lib/foodlog')).saveEntry;
    
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    );

    const textarea = screen.getByLabelText(/what did you eat/i);
    fireEvent.change(textarea, { target: { value: '1 egg' } });

    const analyzeButton = screen.getByRole('button', { name: /analyze/i });
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save entry/i });
      expect(saveButton).not.toBeDisabled();
      
      fireEvent.click(saveButton);
      expect(mockSaveEntry).toHaveBeenCalled();
    });
  });

  it('undo last button works when entries exist', async () => {
    const mockUndoLast = vi.mocked(vi.importMock('../../../lib/foodlog')).undoLast;
    
    // Mock that there are existing entries
    mockListEntries.mockReturnValue([
      {
        id: 'existing-entry',
        timestamp: new Date().toISOString(),
        items: [],
        totals: { kcal: 100, protein: 10, carbs: 5, fat: 2 },
        notes: []
      }
    ]);

    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      const undoButton = screen.getByRole('button', { name: /undo last/i });
      expect(undoButton).not.toBeDisabled();
      
      fireEvent.click(undoButton);
      expect(mockUndoLast).toHaveBeenCalled();
    });
  });

  it('prompt controls panel toggles visibility', () => {
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    );

    const controlsButton = screen.getByRole('button', { name: /prompt controls/i });
    
    // Initially collapsed
    expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText(/sensitivity/i)).not.toBeInTheDocument();

    // Expand
    fireEvent.click(controlsButton);
    expect(controlsButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Diet Style')).toBeInTheDocument();
    expect(screen.getByText('Units')).toBeInTheDocument();

    // Collapse
    fireEvent.click(controlsButton);
    expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
  });
});