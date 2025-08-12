import React, { useState, useEffect } from 'react';

interface DateOfBirthCarouselProps {
  value: { month: number; day: number; year: number };
  onChange: (date: { month: number; day: number; year: number }) => void;
  className?: string;
}

export const DateOfBirthCarousel: React.FC<DateOfBirthCarouselProps> = ({
  value,
  onChange,
  className = ''
}) => {
  // Generate data arrays
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

  // Handle month change
  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(event.target.value);
    const maxDays = getDaysInMonth(newMonth, value.year);
    const newDay = value.day > maxDays ? maxDays : value.day;
    
    onChange({
      month: newMonth,
      day: newDay,
      year: value.year
    });
  };

  // Handle day change
  const handleDayChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newDay = parseInt(event.target.value);
    onChange({
      ...value,
      day: newDay
    });
  };

  // Handle year change
  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(event.target.value);
    const maxDays = getDaysInMonth(value.month, newYear);
    const newDay = value.day > maxDays ? maxDays : value.day;
    
    onChange({
      month: value.month,
      day: newDay,
      year: newYear
    });
  };

  // Generate days array based on current month/year
  const days = Array.from({ length: getDaysInMonth(value.month, value.year) }, (_, i) => i + 1);

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-lg">
        <div className="grid grid-cols-3 gap-4">
          {/* Month Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Month
            </label>
            <select
              value={value.month}
              onChange={handleMonthChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Month"
            > // eslint-disable-next-line react/jsx-key
              {months.map((month, index) => (
                <option key={index} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          {/* Day Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Day
            </label>
            <select
              value={value.day}
              onChange={handleDayChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Day"
            > // eslint-disable-next-line react/jsx-key
              {days.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year
            </label>
            <select
              value={value.year}
              onChange={handleYearChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Year"
            > // eslint-disable-next-line react/jsx-key
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Date Display */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-center text-gray-700 font-medium">
            Selected: {months[value.month - 1]} {value.day}, {value.year}
          </p>
        </div>
      </div>
    </div>
  );
};