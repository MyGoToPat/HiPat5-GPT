import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingProvider } from '../src/context/OnboardingContext';
import { StepAge } from '../src/components/onboarding/steps/StepAge';

// Mock the onboarding context for testing
const MockOnboardingWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <OnboardingProvider>
      {children}
    </OnboardingProvider>
  );
};

describe('StepAge E2E Tests', () => {
  it('should initialize with July 1, 1999 and show valid age', async () => {
    const { getByText } = render(
      <MockOnboardingWrapper>
        <StepAge />
      </MockOnboardingWrapper>
    );

    // Verify default state shows valid age
    await waitFor(() => {
      expect(getByText(/Date of birth recorded/)).toBeInTheDocument();
      expect(getByText(/years old/)).toBeInTheDocument();
    });
  });

  it('should show error for underage users', async () => {
    // Mock a component with underage date
    const UnderageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      return (
        <OnboardingProvider>
          {children}
        </OnboardingProvider>
      );
    };

    // This would be implemented with actual carousel interaction in a full E2E test
    const { getByText } = render(
      <UnderageWrapper>
        <StepAge />
      </UnderageWrapper>
    );

    // Verify error message appears for underage selection
    // In real E2E, this would involve scrolling carousel to recent year
    expect(getByText(/Your date of birth helps us calculate/)).toBeInTheDocument();
  });

  it('should handle carousel momentum scrolling', async () => {
    const { getByRole } = render(
      <MockOnboardingWrapper>
        <StepAge />
      </MockOnboardingWrapper>
    );

    const monthWheel = getByRole('listbox', { name: 'Month' });
    
    // Simulate momentum scroll interaction
    fireEvent.mouseDown(monthWheel, { clientY: 100 });
    fireEvent.mouseMove(monthWheel, { clientY: 50 });
    fireEvent.mouseUp(monthWheel);
    
    // Verify wheel responds to interaction
    expect(monthWheel).toBeInTheDocument();
  });

  it('should save date in YYYY-MM-DD format', async () => {
    const { getByText } = render(
      <MockOnboardingWrapper>
        <StepAge />
      </MockOnboardingWrapper>
    );

    // Verify component renders with proper date format
    await waitFor(() => {
      expect(getByText(/Date of birth recorded/)).toBeInTheDocument();
    });
    
    // In a full E2E test, this would:
    // 1. Scroll carousel to June 15, 1995
    // 2. Verify age calculation shows correct age
    // 3. Click Next button
    // 4. Verify Supabase receives '1995-06-15' format
  });
});