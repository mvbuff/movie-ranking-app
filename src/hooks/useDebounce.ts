import { useState, useEffect } from 'react';

/**
 * Custom hook that debounces a value
 * Returns an array with the debounced value as the first element for array destructuring
 * Useful for delaying API calls until user stops typing/sliding
 */
export function useDebounce<T>(value: T, delay: number): [T] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set debouncedValue to value (passed in) after the specified delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes (also on delay change or unmount)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return [debouncedValue];
}

/**
 * Array version of useDebounce that returns both the current and debounced value
 * Format: [currentValue, debouncedValue]
 */
export function useDebounceArray<T>(value: T, delay: number): [T, T] {
  const [debouncedValue] = useDebounce(value, delay);
  return [value, debouncedValue];
}

export default useDebounce;