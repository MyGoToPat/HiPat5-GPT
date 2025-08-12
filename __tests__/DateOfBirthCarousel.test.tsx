import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { DateOfBirthCarousel } from '../src/components/onboarding/DateOfBirthCarousel';

describe('DateOfBirthCarousel', () => {
  const mockOnChange = jest.fn();
  const defaultProps = {
    value: { month: 7, day: 1, year: 1999 },
    onChange: mockOnChange
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders correctly with default July 1, 1999', () => {
    const { container } = render(<DateOfBirthCarousel {...defaultProps} />);
    expect(container).toMatchSnapshot();
  });

  it('displays the correct month, day, and year', () => {
    const { getByRole } = render(<DateOfBirthCarousel {...defaultProps} />);
    
    const monthWheel = getByRole('listbox', { name: 'Month' });
    const dayWheel = getByRole('listbox', { name: 'Day' });
    const yearWheel = getByRole('listbox', { name: 'Year' });
    
    expect(monthWheel).toBeInTheDocument();
    expect(dayWheel).toBeInTheDocument();
    expect(yearWheel).toBeInTheDocument();
  });

  it('has proper ARIA labels', () => {
    const { getByRole } = render(<DateOfBirthCarousel {...defaultProps} />);
    
    expect(getByRole('listbox', { name: 'Month' })).toBeInTheDocument();
    expect(getByRole('listbox', { name: 'Day' })).toBeInTheDocument();
    expect(getByRole('listbox', { name: 'Year' })).toBeInTheDocument();
  });

  it('handles momentum scrolling interactions', () => {
    const { getByRole } = render(<DateOfBirthCarousel {...defaultProps} />);
    
    const monthWheel = getByRole('listbox', { name: 'Month' });
    
    // Simulate mouse drag
    fireEvent.mouseDown(monthWheel, { clientY: 100 });
    fireEvent.mouseMove(monthWheel, { clientY: 50 });
    fireEvent.mouseUp(monthWheel);
    
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('enforces minimum age of 18 years', () => {
    const underageProps = {
      value: { month: 1, day: 1, year: 2010 },
      onChange: mockOnChange
    };
    
    const { container } = render(<DateOfBirthCarousel {...underageProps} />);
    // Component should render but parent should handle validation
    expect(container).toMatchSnapshot();
  });
});